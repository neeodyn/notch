/**
 * Labelled regression fixtures for Notch's AI quoting, version 1.
 * All examples are synthetic. Each capture fixture pairs a walk transcript
 * with a raw AI extraction (including deliberate mistakes) and the exact
 * result expected after Notch's deterministic checks.
 */
export const FIXTURE_SET_VERSION = "2026-11-v1";

export const CAPTURE_FIXTURES = [
  {
    label: "Spoken room prices, optional ceiling and deposit are kept",
    transcript:
      "Quote for Sarah Miller, 14 Kauri Street, Ponsonby. Lounge, five by four, stud two-four, walls and ceiling, two coats, eleven hundred. Hallway, eight by one-two, walls only, ceiling optional at one ninety, four hundred. Thirty percent deposit.",
    extraction: {
      client: { name: "Sarah Miller", address: "14 Kauri Street, Ponsonby" },
      areas: [
        { name: "Lounge", length_m: 5, width_m: 4, stud_m: 2.4, surfaces: ["walls", "ceiling"], coats: 2, spoken_price: 1100 },
        { name: "Hallway", length_m: 8, width_m: 1.2, stud_m: null, surfaces: ["walls", "ceiling"], optional_surfaces: ["ceiling"], coats: 2, spoken_price: 400, optional_spoken_price: 190 },
      ],
      deposit_pct: 30,
      unclear: [],
    },
    expect: {
      prices: [1100, 400],
      optionalPrices: [null, 190],
      depositPct: 30,
      unclearIncludes: ["Hallway: stud height not stated"],
    },
  },
  {
    label: "A price the painter never said is removed and flagged",
    transcript: "Bedroom, four by three, stud two-four, walls only, two coats.",
    extraction: {
      areas: [{ name: "Bedroom", length_m: 4, width_m: 3, stud_m: 2.4, surfaces: ["walls"], coats: 2, spoken_price: 650 }],
      unclear: [],
    },
    expect: { prices: [null], unclearIncludes: ["Bedroom: price $650 wasn't clearly said"] },
  },
  {
    label: "Weatherboard m² copied into soffits and fascia is cleared",
    transcript: "Exterior, weatherboards about one-eighty square metres, soffits and fascia included, three thousand two hundred.",
    extraction: {
      areas: [
        { name: "Exterior", kind: "exterior", area_m2_spoken: 180, soffits_m2: 180, fascia_m: 180, surfaces: ["weatherboards", "soffits", "fascia"], spoken_price: 3200 },
      ],
      unclear: [],
    },
    expect: {
      prices: [3200],
      soffits: [null],
      fascia: [null],
      unclearIncludes: ["Exterior: soffit m² matched", "Exterior: fascia matched"],
    },
  },
  {
    label: "NZ trade shorthand and written amounts count as spoken",
    transcript: "Kitchen, walls only, stud two-four, four fifty. Laundry, stud two-four, two grand. Garage door, stud two-four, $1,250. Deck, stud two-four, 1.5k.",
    extraction: {
      areas: [
        { name: "Kitchen", stud_m: 2.4, surfaces: ["walls"], spoken_price: 450 },
        { name: "Laundry", stud_m: 2.4, surfaces: ["walls"], spoken_price: 2000 },
        { name: "Garage door", stud_m: 2.4, kind: "extra", surfaces: [], spoken_price: 1250 },
        { name: "Deck", stud_m: 2.4, kind: "extra", surfaces: [], spoken_price: 1500 },
      ],
      unclear: [],
    },
    expect: { prices: [450, 2000, 1250, 1500], unclearIncludes: [] },
  },
  {
    label: "'Same as the lounge' copies surfaces, coats and colour",
    transcript: "Lounge, stud two-four, walls and ceiling, three coats in Resene Alabaster, nine hundred. Dining, stud two-four, same as the lounge, seven hundred.",
    extraction: {
      areas: [
        { name: "Lounge", stud_m: 2.4, surfaces: ["walls", "ceiling"], coats: 3, colour: "Resene Alabaster", spoken_price: 900 },
        { name: "Dining", stud_m: 2.4, same_as_area: "the lounge", surfaces: [], spoken_price: 700 },
      ],
      unclear: [],
    },
    expect: {
      prices: [900, 700],
      inherited: { index: 1, surfaces: ["walls", "ceiling"], coats: 3, colour: "Resene Alabaster" },
      unclearIncludes: [],
    },
  },
  {
    label: "A deposit that was never mentioned is removed",
    transcript: "Bathroom, stud two-four, ceiling only, two coats, three hundred.",
    extraction: {
      areas: [{ name: "Bathroom", stud_m: 2.4, surfaces: ["ceiling"], spoken_price: 300 }],
      deposit_pct: 50,
      unclear: [],
    },
    expect: { prices: [300], depositPct: null, unclearIncludes: ["Deposit: percentage wasn't clearly said"] },
  },
];

export const EDIT_ITEMS = [
  { id: "i1", quote_id: "q1", area_number: 1, name: "Lounge", kind: "interior", length_m: 5, width_m: 4, stud_m: 2.4, surfaces: ["walls", "ceiling"], coats: 2, prep: "standard", spoken_price: 1100, price: 1100, price_source: "spoken" },
  { id: "i2", quote_id: "q1", area_number: 2, name: "Hallway", kind: "interior", length_m: 8, width_m: 1.2, stud_m: 2.4, surfaces: ["walls"], coats: 2, prep: "standard", spoken_price: 400, price: 400, price_source: "spoken" },
  { id: "i3", quote_id: "q1", area_number: 2, name: "Hallway — Ceiling", kind: "interior", length_m: 8, width_m: 1.2, stud_m: 2.4, surfaces: ["ceiling"], coats: 2, prep: "standard", spoken_price: 190, price: 190, price_source: "spoken", optional: true, is_optional_split: true },
  { id: "i4", quote_id: "q1", area_number: 3, name: "Bedroom 1", kind: "interior", length_m: 4, width_m: 3, stud_m: 2.4, surfaces: ["walls"], coats: 2, prep: "standard", price: 700, price_source: "owner" },
  { id: "i5", quote_id: "q1", area_number: 4, name: "Bedroom 2", kind: "interior", length_m: 3.5, width_m: 3, stud_m: 2.4, surfaces: ["walls"], coats: 2, prep: "standard", spoken_price: 600, price: 600, price_source: "spoken" },
];

export const EDIT_QUOTE = { id: "q1", client_name: "Sarah Miller", address: "14 Kauri Street", deposit_pct: 30, notes: "" };

export const EDIT_FIXTURES = [
  {
    label: "A spoken new price becomes one reviewable change with evidence",
    transcript: "Hallway is four fifty",
    raw: [{ op: "set", area: "Hallway", field: "spoken_price", value: 450, evidence: "hallway is four fifty" }],
    expect: { changes: [{ op: "set_area", itemId: "i2", field: "spoken_price", before: 400, after: 450, hasEvidence: true }], clarifications: 0 },
  },
  {
    label: "Two matching rooms produce a question instead of a guess",
    transcript: "Bedroom is three coats",
    raw: [{ op: "set", area: "bedroom", field: "coats", value: 3 }],
    expect: { changes: [], clarificationIncludes: "Bedroom 1 or Bedroom 2" },
  },
  {
    label: "A price that wasn't said is refused, the rest is kept",
    transcript: "Make the lounge three coats",
    raw: [
      { op: "set", area: "Lounge", field: "coats", value: 3 },
      { op: "set", area: "Lounge", field: "spoken_price", value: 1500 },
    ],
    expect: { changes: [{ op: "set_area", itemId: "i1", field: "coats", before: 2, after: 3 }], clarificationIncludes: "clear price for Lounge" },
  },
  {
    label: "Fields outside the allow-list are never applied",
    transcript: "Change the rate card estimate to nine hundred",
    raw: [{ op: "set", area: "Lounge", field: "price_book_estimate", value: 900 }],
    expect: { changes: [], clarifications: 1 },
  },
  {
    label: "Removing an area is marked destructive",
    transcript: "Drop the hallway",
    raw: [{ op: "remove_area", area: "Hallway" }],
    expect: { changes: [{ op: "remove_area", itemId: "i2", destructive: true }], clarifications: 0 },
  },
  {
    label: "Unknown rooms are reported, not invented",
    transcript: "Garage is two coats",
    raw: [{ op: "set", area: "Garage", field: "coats", value: 2 }],
    expect: { changes: [], clarificationIncludes: "Couldn't find an area called “Garage”" },
  },
];