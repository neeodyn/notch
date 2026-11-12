import test from "node:test";
import assert from "node:assert/strict";
import { calculateQuoteTotals } from "./pricing.js";
import { extractSpokenNumbers, isNumberSpoken } from "./spoken-numbers.js";
import { postProcessExtraction } from "./quote-ai.js";
import {
  buildEditProposal,
  simulateEditChanges,
  validateConfirmedChanges,
} from "./quote-edits.js";
import {
  CAPTURE_FIXTURES,
  EDIT_FIXTURES,
  EDIT_ITEMS,
  EDIT_QUOTE,
} from "./ai-fixtures.v1.js";

test("spoken numbers: words, trade shorthand and digits", () => {
  const cases = [
    ["eleven hundred", 1100],
    ["four fifty", 450],
    ["one ninety", 190],
    ["two thousand five hundred", 2500],
    ["twenty-five hundred", 2500],
    ["a grand", 1000],
    ["two grand", 2000],
    ["$1,250", 1250],
    ["1.5k", 1500],
    ["11 hundred", 1100],
    ["thirty percent", 30],
    ["fifteen hundred and fifty", 1550],
  ];
  for (const [text, value] of cases) {
    assert.ok(isNumberSpoken(value, text), `${text} should contain ${value}`);
  }
  assert.equal(isNumberSpoken(650, "four by three, stud two-four"), false);
  assert.ok(extractSpokenNumbers("five by four").has(5));
});

for (const fixture of CAPTURE_FIXTURES) {
  test(`capture: ${fixture.label}`, () => {
    const out = postProcessExtraction(fixture.extraction, { transcript: fixture.transcript, defaultStudM: 2.4 });
    const { expect } = fixture;
    assert.deepEqual(out.areas.map((a) => a.spoken_price ?? null), expect.prices);
    if (expect.optionalPrices) {
      assert.deepEqual(out.areas.map((a) => a.optional_spoken_price ?? null), expect.optionalPrices);
    }
    if ("depositPct" in expect) assert.equal(out.deposit_pct ?? null, expect.depositPct);
    if (expect.soffits) assert.deepEqual(out.areas.map((a) => a.soffits_m2 ?? null), expect.soffits);
    if (expect.fascia) assert.deepEqual(out.areas.map((a) => a.fascia_m ?? null), expect.fascia);
    if (expect.inherited) {
      const area = out.areas[expect.inherited.index];
      assert.deepEqual(area.surfaces, expect.inherited.surfaces);
      assert.equal(area.coats, expect.inherited.coats);
      assert.equal(area.colour, expect.inherited.colour);
    }
    for (const note of expect.unclearIncludes) {
      assert.ok(out.unclear.some((u) => u.includes(note)), `missing note: ${note} in ${JSON.stringify(out.unclear)}`);
    }
    if (expect.unclearIncludes.length === 0) assert.deepEqual(out.unclear, []);
  });
}

for (const fixture of EDIT_FIXTURES) {
  test(`edit: ${fixture.label}`, () => {
    const proposal = buildEditProposal({
      rawChanges: fixture.raw,
      quote: EDIT_QUOTE,
      items: EDIT_ITEMS,
      transcript: fixture.transcript,
    });
    const { expect } = fixture;
    assert.equal(proposal.changes.length, expect.changes.length);
    expect.changes.forEach((want, idx) => {
      const got = proposal.changes[idx];
      for (const key of ["op", "itemId", "field", "before", "after", "destructive"]) {
        if (key in want) assert.deepEqual(got[key], want[key], key);
      }
      if (want.hasEvidence) assert.ok(got.evidence);
    });
    if ("clarifications" in expect) assert.equal(proposal.clarifications.length, expect.clarifications);
    if (expect.clarificationIncludes) {
      assert.ok(proposal.clarifications.some((c) => c.includes(expect.clarificationIncludes)), JSON.stringify(proposal.clarifications));
    }
  });
}

test("simulate: new spoken price reprices only that area and totals follow", () => {
  const { changes } = buildEditProposal({
    rawChanges: [{ op: "set", area: "Hallway", field: "spoken_price", value: 450 }],
    quote: EDIT_QUOTE,
    items: EDIT_ITEMS,
    transcript: "hallway is four fifty",
  });
  const sim = simulateEditChanges({ items: EDIT_ITEMS, changes });
  assert.equal(sim.items.find((it) => it.id === "i2").price, 450);
  assert.equal(sim.items.find((it) => it.id === "i1").price, 1100);
  assert.deepEqual([...sim.updatedIds], ["i2"]);
  assert.deepEqual(sim.changedFields, ["area:2:price"]);
  const totals = calculateQuoteTotals({ items: sim.items, gstRate: 0.15 });
  assert.equal(totals.subtotalExclGst, 1100 + 450 + 700 + 600);
});

test("simulate: an owner-set price survives a coats change", () => {
  const sim = simulateEditChanges({
    items: EDIT_ITEMS,
    changes: [{ op: "set_area", itemId: "i4", field: "coats", after: 3 }],
  });
  const bedroom = sim.items.find((it) => it.id === "i4");
  assert.equal(bedroom.coats, 3);
  assert.equal(bedroom.price, 700);
  assert.equal(bedroom.price_source, "owner");
});

test("simulate: removing a main area removes its optional ceiling too", () => {
  const sim = simulateEditChanges({ items: EDIT_ITEMS, changes: [{ op: "remove_area", itemId: "i2" }] });
  assert.deepEqual([...sim.removedIds].sort(), ["i2", "i3"]);
  assert.equal(sim.items.some((it) => it.area_number === 2), false);
});

test("simulate: making a surface optional splits it into a new optional item", () => {
  const sim = simulateEditChanges({
    items: EDIT_ITEMS,
    changes: [{ op: "set_area", itemId: "i1", field: "optional_surfaces", after: ["ceiling"] }],
  });
  assert.deepEqual(sim.items.find((it) => it.id === "i1").surfaces, ["walls"]);
  const split = sim.items.find((it) => it.isNew);
  assert.equal(split.is_optional_split, true);
  assert.deepEqual(split.surfaces, ["ceiling"]);
});

test("apply: stale before-values and unknown areas are rejected", () => {
  assert.throws(
    () => validateConfirmedChanges([{ op: "set_area", itemId: "i2", field: "spoken_price", before: 999, after: 450 }], { quote: EDIT_QUOTE, items: EDIT_ITEMS }),
    /changed since you spoke/
  );
  assert.throws(
    () => validateConfirmedChanges([{ op: "remove_area", itemId: "gone" }], { quote: EDIT_QUOTE, items: EDIT_ITEMS }),
    /changed since you spoke/
  );
  assert.throws(
    () => validateConfirmedChanges([{ op: "set_area", itemId: "i1", field: "price_source", before: "spoken", after: "owner" }], { quote: EDIT_QUOTE, items: EDIT_ITEMS }),
    /can't be applied/
  );
});