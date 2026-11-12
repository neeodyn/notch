import test from "node:test";
import assert from "node:assert/strict";
import {
  computeAreaMeasurements,
  computePriceBookFigure,
  priceSingleItem,
  expandAreasToQuoteItems,
  calculateQuoteTotals,
  matchPhotosToItems,
  formatAreaSummaryLine,
  formatMoney,
} from "./pricing.js";

test("SPEC benchmark: lounge 5 x 4 m, stud 2.4 -> walls 38.88 m2, ceiling 20 m2 -> 864.32 -> 870", () => {
  const lounge = {
    area_number: 1,
    name: "Lounge",
    kind: "interior",
    length_m: 5,
    width_m: 4,
    stud_m: 2.4,
    surfaces: ["walls", "ceiling"],
    coats: 2,
    prep: "standard",
  };

  const meas = computeAreaMeasurements(lounge, { default_stud_m: 2.4, openings_pct: 10 });
  assert.equal(meas.wallsM2, 38.88);
  assert.equal(meas.ceilingM2, 20);
  assert.equal(meas.skirtingM, 18);

  const book = {
    walls_m2: 14,
    ceiling_m2: 16,
    prep: { light: 0.85, standard: 1, heavy: 1.35 },
    coats: { 1: 0.7, 2: 1, 3: 1.35 },
    round_to: 10,
  };

  const figure = computePriceBookFigure(lounge, book, { default_stud_m: 2.4, openings_pct: 10 });
  assert.equal(figure, 870);

  const priced = priceSingleItem(lounge, book, { default_stud_m: 2.4, openings_pct: 10 });
  assert.equal(priced.price, 870);
  assert.equal(priced.price_source, "price_book");

  const line = formatAreaSummaryLine(priced, { default_stud_m: 2.4, openings_pct: 10 }, "NZD");
  assert.equal(line, "Lounge · 5 × 4 m · stud 2.4 · walls 38.9 m², ceiling 20 m² · 2 coats · $870");
});

test("Exterior uses area_m2_spoken with prep and coat multipliers plus doors/windows", () => {
  const book = {
    weatherboards_m2: 25,
    door_each: 100,
    window_each: 80,
    prep: { light: 0.8, standard: 1, heavy: 1.4 },
    coats: { 1: 0.7, 2: 1, 3: 1.3 },
    round_to: 10,
  };
  const ext = {
    area_number: 1,
    name: "North Weatherboards",
    kind: "exterior",
    area_m2_spoken: 100,
    surfaces: ["weatherboards"],
    prep: "heavy", // 1.4
    coats: 2, // 1.0
    doors: 1, // +100
    windows: 2, // +160
  };
  // 100 * 25 * 1.4 * 1.0 + 100 + 160 = 3500 + 260 = 3760
  assert.equal(computePriceBookFigure(ext, book), 3760);
});

test("Priority: spoken_price beats price book, flags <0.5x or >2x, null when neither exists", () => {
  const book = {
    walls_m2: 14,
    ceiling_m2: 16,
    prep: { standard: 1 },
    coats: { 2: 1 },
    round_to: 10,
  };
  const baseRoom = {
    area_number: 1,
    name: "Lounge",
    kind: "interior",
    length_m: 5,
    width_m: 4,
    stud_m: 2.4,
    surfaces: ["walls", "ceiling"],
    coats: 2,
    prep: "standard",
  };

  // Price book is 870
  const spokenNormal = priceSingleItem({ ...baseRoom, spoken_price: 1100 }, book);
  assert.equal(spokenNormal.price, 1100);
  assert.equal(spokenNormal.price_source, "spoken");
  assert.equal(spokenNormal.flagged, false);

  const spokenTooLow = priceSingleItem({ ...baseRoom, spoken_price: 400 }, book);
  assert.equal(spokenTooLow.flagged, true);

  const spokenTooHigh = priceSingleItem({ ...baseRoom, spoken_price: 1800 }, book);
  assert.equal(spokenTooHigh.flagged, true);

  const unpriced = priceSingleItem(baseRoom, null);
  assert.equal(unpriced.price, null);
  assert.equal(unpriced.price_source, "none");
  assert.equal(formatMoney(unpriced.price, "NZD"), "Needs your price");
});

test("expandAreasToQuoteItems splits optional ceiling into a separate optional item", () => {
  const items = expandAreasToQuoteItems([
    {
      area_number: 2,
      name: "Hallway",
      kind: "interior",
      length_m: 8,
      width_m: 1.2,
      surfaces: ["walls", "ceiling"],
      optional_surfaces: ["ceiling"],
      spoken_price: 400,
      optional_spoken_price: 180,
      coats: 2,
    },
  ]);

  assert.equal(items.length, 2);
  assert.deepEqual(items[0].surfaces, ["walls"]);
  assert.equal(items[0].optional, false);
  assert.equal(items[0].price, 400);
  assert.deepEqual(items[1].surfaces, ["ceiling"]);
  assert.equal(items[1].optional, true);
  assert.equal(items[1].price, 180);
});

test("calculateQuoteTotals computes Excl. GST, GST 15%, and Incl. GST in both modes", () => {
  const items = [
    { id: "1", optional: false, price: 1100, price_source: "spoken" },
    { id: "2", optional: false, price: 400, price_source: "spoken" },
    { id: "3", optional: true, price: 200, price_source: "spoken" },
  ];

  // Excl. GST mode (default): 1500 excl -> GST 225 -> 1725 incl, 30% deposit = 517.50
  const exclRes = calculateQuoteTotals({
    items,
    tickedOptionalIds: [],
    gstRate: 0.15,
    pricesIncludeGst: false,
    depositPct: 30,
  });
  assert.equal(exclRes.subtotalExclGst, 1500);
  assert.equal(exclRes.gstAmount, 225);
  assert.equal(exclRes.totalInclGst, 1725);
  assert.equal(exclRes.depositAmount, 517.5);

  // Incl. GST mode with optional ticked: 1700 incl -> 1478.26 excl + 221.74 GST
  const inclRes = calculateQuoteTotals({
    items,
    tickedOptionalIds: ["3"],
    gstRate: 0.15,
    pricesIncludeGst: true,
    depositPct: 25,
  });
  assert.equal(inclRes.totalInclGst, 1700);
  assert.equal(inclRes.subtotalExclGst, 1478.26);
  assert.equal(inclRes.gstAmount, 221.74);
});

test("matchPhotosToItems matches taken_at_s to area segment spans", () => {
  const segments = [
    { id: 0, start: 0, end: 5, text: "Sarah Miller" },
    { id: 1, start: 5, end: 18, text: "Lounge five by four" },
    { id: 2, start: 18, end: 30, text: "Hallway eight by one-two" },
  ];
  const items = [
    { id: "a1", area_number: 1, start_segment: 1, is_optional_split: false },
    { id: "a2", area_number: 2, start_segment: 2, is_optional_split: false },
  ];
  const matched = matchPhotosToItems(
    [{ id: "p1", taken_at_s: 10 }, { id: "p2", taken_at_s: 24 }],
    items,
    segments
  );
  assert.equal(matched[0].item_id, "a1");
  assert.equal(matched[1].item_id, "a2");
});