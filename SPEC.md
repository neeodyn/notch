# SPEC.md: Notch (NZ Painters & Decorators Edition)
"Walk the house. Send the quote."

## Goal
A mobile-first installable web app (PWA) for New Zealand residential and commercial painters and decorators. The painter taps New quote, walks through the property talking, and snaps each room or exterior elevation. One recording fills the whole quote: client details, each room/area, dimensions and m², surfaces, coats, prep, colours, photos, prices, optional items, GST (15%), deposit, and notes. The painter fixes anything by tapping or speaking a change, then sends a link the homeowner can open, tick optional extras on, and sign to accept. Native Apple aesthetic throughout.

## Data Model
businesses(
  id, owner_id, name, phone, email, logo_uri,
  currency default 'NZD',
  gst_number text null,
  gst_rate numeric default 0.15,
  prices_include_gst bool default false,
  default_stud_m numeric default 2.4,
  openings_pct numeric default 10,
  min_charge numeric default 0,
  terms text,
  price_book jsonb null,
  plan in trial|founding|active default 'trial',
  billing_interval in monthly|yearly default 'monthly',
  trial_started_at timestamptz,
  created_date timestamptz
)

quotes(
  id, business_id, client_name, client_phone, client_email, address,
  status in draft|sent|viewed|accepted|declined,
  deposit_pct default 0, notes, unclear jsonb,
  public_token unique (24+ random chars),
  subtotal_excl_gst numeric, gst_amount numeric, total_incl_gst numeric, total numeric, deposit_amount numeric,
  selected_optional_ids text[],
  sent_at, viewed_at, accepted_at, accepted_name, accepted_ip, accepted_user_agent, declined_at, created_date
)

quote_items(
  id, quote_id, area_number int, name text,
  kind in interior|exterior|extra,
  length_m numeric null, width_m numeric null, stud_m numeric null, area_m2_spoken numeric null,
  surfaces text[] (walls|ceiling|skirting|weatherboards|soffits|fascia),
  doors int default 0, windows int default 0, coats int default 2,
  prep in light|standard|heavy default 'standard',
  prep_notes text, colour text,
  spoken_price numeric null, price numeric null, price_book_estimate numeric null,
  price_source in spoken|price_book|owner|none,
  optional bool default false, is_optional_split bool default false,
  needs_owner_price bool default false, flagged bool default false,
  customer_description text, start_segment int null
)

photos(id, quote_id, item_id null, area_number int, file_uri, taken_at_s real, pin_x real null, pin_y real null)
recordings(id, quote_id, kind in capture|edit, file_uri, duration_s, transcript, segments jsonb, status)
quote_events(id, quote_id, type, meta jsonb, created_date)
quote_versions(id, quote_id, reason, snapshot jsonb, created_date)

price_book shape (all optional):
{
  "walls_m2": 0, "ceiling_m2": 0, "weatherboards_m2": 0, "soffits_m2": 0,
  "fascia_m": 0, "skirting_m": 0, "door_each": 0, "window_each": 0,
  "prep": { "light": 0.85, "standard": 1, "heavy": 1.35 },
  "coats": { "1": 0.7, "2": 1, "3": 1.35 },
  "round_to": 10
}

## Pricing (pure function, unit tested)
- Interior geometry:
  - walls m² = 2(L + W) * stud * (1 - openings_pct / 100)
  - ceiling m² = L * W
  - skirting m = 2(L + W)
- Exterior uses area_m2_spoken.
- Price book formula:
  price = sum(m² * rate * prep_mult * coats_mult) + skirting * rate + doors * rate + windows * rate, rounded UP to round_to.
- Priority: owner -> spoken_price -> price_book -> null ("Needs your price").
- Flag (flagged = true) any spoken price below 0.5x or above 2x the price-book figure.
- Totals show Excl. GST, GST 15%, and Incl. GST. Money formatted with en-NZ.
- Benchmark unit test: lounge 5 x 4 m, stud 2.4, openings 10% -> walls 38.88 m², ceiling 20 m². At walls 14 and ceiling 16 (prep 1, coats 1, round_to 10) -> 864.32 -> 870.

## AI Routes & Vocabulary
- Transcribe vocabulary prompt:
  "gib, stud, skirting, scotia, architraves, weatherboards, soffits, fascia, spouting, sugar soap, undercoat, low sheen, semi-gloss, Resene, Dulux, Wattyl"
- POST /api/fill returns { client, areas[], deposit_pct, notes, unclear[] }:
  - Dimensions in metres ("five by four" = 5 x 4, "stud two-four" = 2.4, "eight by one-two" = 8 x 1.2).
  - Stated total ("about one-eighty square metres") -> area_m2_spoken.
  - Interior stud height not said -> stud_m = null and add a note to unclear[].
  - Copy spoken prices verbatim; never estimate a price.
  - One object per room/area in spoken order; "same as the lounge" copies surfaces, coats, and prep.
  - prep: light ("freshen up"), heavy ("lots of filling", "peeling", "strip wallpaper"), otherwise standard.
  - Optional items ("ceiling optional") split or flagged optional as spoken.
  - customer_description: one plain-English sentence, NZ spelling (colour, metres), no prices.
- POST /api/edit ops: set { area, field, value } | add_area { value } | remove_area { area }, resolving areas by number or name ("the hallway").

## Plans & Trial
- 7-day free trial from first sent quote.
- Founding plan: NZ$39/mo or NZ$390/yr (first 20 customers).
- Standard plan: NZ$49/mo or NZ$490/yr.

## Acceptance Test
1. Skip the price book. Say: "Quote for Sarah Miller, 14 Kauri Street, Ponsonby, 021 555 0134. Lounge, five by four, stud two-four, walls and ceiling, two coats, eleven hundred. Hallway, eight by one-two, walls only, ceiling optional, four hundred. Thirty percent deposit." Snap a photo in each room.
2. Check: client is right; two areas with correct m², photos, and prices; hallway ceiling is optional; GST 15% shows.
3. Say "hallway is four fifty" -> only that price changes.
4. Send, open the link on a second phone, tick the optional item, accept.
