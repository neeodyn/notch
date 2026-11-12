import test from "node:test";
import assert from "node:assert/strict";
import {
  STARTER_PRICE_BOOK,
  computePriceBookFigure,
  priceSingleItem,
  expandTreesToQuoteItems,
  calculateQuoteTotals,
  matchPhotosToItems,
  inferSizeClass,
} from "./pricing.js";

test("inferSizeClass maps heights to small, medium, large, xl", () => {
  assert.equal(inferSizeClass(22), "small");
  assert.equal(inferSizeClass(30), "medium");
  assert.equal(inferSizeClass(60), "medium");
  assert.equal(inferSizeClass(65), "large");
  assert.equal(inferSizeClass(85), "xl");
});

test("computePriceBookFigure applies hazards, stump grind, haul, and rounds UP to round_to", () => {
  // medium remove = 1100
  // hazards: near_structure (20%) + over_fence (10%) => 1100 * 1.30 = 1430
  // stump grind (medium) = 225
  // haul (15% of base 1100) = 165
  // raw = 1430 + 225 + 165 = 1820 -> rounded UP to 25 => 1825
  const fig = computePriceBookFigure(
    {
      work: "remove",
      height_ft: 45,
      hazards: ["near_structure", "over_fence"],
      stump: "grind",
      haul: true,
    },
    STARTER_PRICE_BOOK
  );
  assert.equal(fig, 1825);
});

test("priceSingleItem prioritizes spoken_price over price book and flags <0.5x or >2x", () => {
  // medium trim = 550, haul 15% = 82.5 -> raw 632.5 -> rounded up to 650
  const normal = priceSingleItem(
    { work: "trim", size_class: "medium", haul: true, stump: "leave", spoken_price: 700 },
    STARTER_PRICE_BOOK
  );
  assert.equal(normal.price, 700);
  assert.equal(normal.price_source, "spoken");
  assert.equal(normal.flagged, false);

  const tooLow = priceSingleItem(
    { work: "trim", size_class: "medium", haul: true, stump: "leave", spoken_price: 250 },
    STARTER_PRICE_BOOK
  );
  assert.equal(tooLow.price, 250);
  assert.equal(tooLow.flagged, true);

  const tooHigh = priceSingleItem(
    { work: "trim", size_class: "medium", haul: true, stump: "leave", spoken_price: 1400 },
    STARTER_PRICE_BOOK
  );
  assert.equal(tooHigh.price, 1400);
  assert.equal(tooHigh.flagged, true);
});

test("power lines with no spoken price requires owner price", () => {
  const item = priceSingleItem(
    { work: "trim", size_class: "medium", hazards: ["power_lines"], haul: true, stump: "leave" },
    STARTER_PRICE_BOOK
  );
  assert.equal(item.price, null);
  assert.equal(item.price_source, "none");
});

test("expandTreesToQuoteItems splits stump == optional into a separate optional item", () => {
  const items = expandTreesToQuoteItems(
    [
      {
        tree_number: 1,
        species: "Silver Maple",
        height_ft: 50,
        work: "remove",
        stump: "optional",
        stump_spoken_price: 275,
        spoken_price: 1850,
        haul: true,
      },
    ],
    STARTER_PRICE_BOOK
  );
  assert.equal(items.length, 2);
  assert.equal(items[0].optional, false);
  assert.equal(items[0].price, 1850);
  assert.equal(items[0].stump, "leave");
  assert.equal(items[1].optional, true);
  assert.equal(items[1].is_stump_line, true);
  assert.equal(items[1].price, 275);
});

test("calculateQuoteTotals applies ticked optional items, min_charge, tax, and deposit", () => {
  const items = [
    { id: "a", optional: false, price: 200, price_source: "spoken" },
    { id: "b", optional: true, price: 100, price_source: "spoken" },
  ];
  // Without optional ticked: raw 200 < minCharge 350 -> subtotal 350, tax 10% = 35, total 385, deposit 20% = 77
  const res1 = calculateQuoteTotals({
    items,
    tickedOptionalIds: [],
    minCharge: 350,
    taxRate: 10,
    depositPct: 20,
  });
  assert.equal(res1.subtotal, 350);
  assert.equal(res1.minChargeApplied, true);
  assert.equal(res1.taxAmount, 35);
  assert.equal(res1.total, 385);
  assert.equal(res1.depositAmount, 77);

  // With larger items exceeding minCharge
  const res2 = calculateQuoteTotals({
    items: [
      { id: "a", optional: false, price: 1000, price_source: "spoken" },
      { id: "b", optional: true, price: 250, price_source: "spoken" },
    ],
    tickedOptionalIds: ["b"],
    minCharge: 350,
    taxRate: 8,
    depositPct: 25,
  });
  assert.equal(res2.subtotal, 1250);
  assert.equal(res2.taxAmount, 100);
  assert.equal(res2.total, 1350);
  assert.equal(res2.depositAmount, 337.5);
});

test("matchPhotosToItems matches taken_at_s to segment spans and falls back to order", () => {
  const segments = [
    { id: 0, start: 0, end: 6, text: "Client info" },
    { id: 1, start: 6, end: 18, text: "First oak tree" },
    { id: 2, start: 18, end: 30, text: "Second pine tree" },
  ];
  const items = [
    { id: "item-1", tree_number: 1, start_segment: 1, is_stump_line: false },
    { id: "item-2", tree_number: 2, start_segment: 2, is_stump_line: false },
  ];
  const photos = [
    { id: "p1", taken_at_s: 11.2 },
    { id: "p2", taken_at_s: 23.5 },
  ];
  const matched = matchPhotosToItems(photos, items, segments);
  assert.equal(matched[0].item_id, "item-1");
  assert.equal(matched[1].item_id, "item-2");
});