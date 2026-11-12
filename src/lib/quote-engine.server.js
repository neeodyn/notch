import crypto from "node:crypto";
import { z } from "zod";
import {
  calculateQuoteTotals,
  describeMissingMeasurements,
  formatMoney,
  mergeUnclearNotes,
  pruneResolvedMeasurementNotes,
} from "@/lib/pricing";
import { postProcessExtraction } from "@/lib/quote-ai";
import {
  buildEditProposal,
  simulateEditChanges,
  validateConfirmedChanges,
} from "@/lib/quote-edits";

export const PAINTER_VOCAB_PROMPT =
  "gib, stud, skirting, scotia, architraves, weatherboards, soffits, fascia, spouting, sugar soap, undercoat, low sheen, semi-gloss, Resene, Dulux, Wattyl";

const AI_RATE_WINDOW_MS = 60_000;
const AI_RATE_MAX_PER_MIN = 15;
const recentAiCallsByUser = new Map();

export function enforceAiRateLimit(userId) {
  const now = Date.now();
  const prev = (recentAiCallsByUser.get(userId) || []).filter((ts) => now - ts < AI_RATE_WINDOW_MS);
  if (prev.length >= AI_RATE_MAX_PER_MIN) {
    throw Object.assign(new Error("Too many voice requests in a minute. Wait a few seconds and try again."), {
      status: 429,
    });
  }
  prev.push(now);
  recentAiCallsByUser.set(userId, prev);
}

export function generatePublicToken() {
  return crypto.randomBytes(18).toString("base64url");
}

export function isPaidPlan(business) {
  return business?.plan === "active" || business?.plan === "founding";
}

export function isTrialExpired(business) {
  if (!business || isPaidPlan(business)) return false;
  if (!business.trial_started_at) return false;
  const startedMs = Date.parse(business.trial_started_at);
  if (!Number.isFinite(startedMs)) return false;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - startedMs > sevenDaysMs;
}

export function getTrialDaysLeft(business) {
  if (!business || isPaidPlan(business)) return null;
  if (!business.trial_started_at) return 7;
  const startedMs = Date.parse(business.trial_started_at);
  if (!Number.isFinite(startedMs)) return 7;
  const elapsedDays = (Date.now() - startedMs) / (24 * 60 * 60 * 1000);
  return Math.max(0, Math.ceil(7 - elapsedDays));
}

/** A homeowner's accept or decline is final: later responses change nothing. */
export function isQuoteResponseLocked(quote) {
  return quote?.status === "accepted" || quote?.status === "declined";
}

export function lockedQuoteResponse(quote) {
  return {
    ok: true,
    locked: true,
    status: quote.status,
    accepted_at: quote.accepted_at || null,
    accepted_name: quote.accepted_name || null,
    declined_at: quote.declined_at || null,
    total: quote.total_incl_gst || quote.total || 0,
    selected_optional_ids: quote.selected_optional_ids || [],
  };
}

export function serializeQuoteTotals(totals) {
  return {
    subtotal_excl_gst: totals.subtotalExclGst,
    gst_amount: totals.gstAmount,
    total_incl_gst: totals.totalInclGst,
    subtotal: totals.subtotalExclGst,
    tax_amount: totals.gstAmount,
    total: totals.totalInclGst,
    deposit_amount: totals.depositAmount,
  };
}

export function getBusinessSettings(business) {
  return {
    default_stud_m: Number(business?.default_stud_m) > 0 ? Number(business.default_stud_m) : 2.4,
    openings_pct:
      business?.openings_pct != null && Number.isFinite(Number(business.openings_pct))
        ? Number(business.openings_pct)
        : 10,
    gst_rate:
      business?.gst_rate != null && Number.isFinite(Number(business.gst_rate))
        ? Number(business.gst_rate)
        : 0.15,
    prices_include_gst: Boolean(business?.prices_include_gst),
    min_charge: Number(business?.min_charge) || 0,
    currency: business?.currency || "NZD",
  };
}

export async function signFileUriIfNeeded(base44, uri) {
  if (!uri) return null;
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
  try {
    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: uri,
      expires_in: 3600,
    });
    return signed_url || null;
  } catch {
    return null;
  }
}

export function buildTimedSegmentsFromTranscript(transcript, durationS = 30) {
  const clean = String(transcript || "").trim();
  if (!clean) return [];
  const rawParts = clean
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks = [];
  for (const part of rawParts) {
    const words = part.split(/\s+/);
    if (words.length <= 24) {
      chunks.push(part);
    } else {
      for (let i = 0; i < words.length; i += 18) {
        chunks.push(words.slice(i, i + 18).join(" "));
      }
    }
  }

  const totalChars = Math.max(1, chunks.reduce((sum, c) => sum + c.length, 0));
  const totalSec = Math.max(4, Number(durationS) || 30);
  let cursorChar = 0;

  return chunks.map((text, idx) => {
    const start = Math.round((cursorChar / totalChars) * totalSec * 10) / 10;
    cursorChar += text.length;
    const end = Math.round((cursorChar / totalChars) * totalSec * 10) / 10;
    return { id: idx, start, end, text };
  });
}

export function formatSegmentsForPrompt(segments = []) {
  return segments
    .map((seg, idx) => {
      const s = Math.max(0, Math.floor(Number(seg.start) || 0));
      const mins = Math.floor(s / 60);
      const secs = String(s % 60).padStart(2, "0");
      return `[s${idx} ${mins}:${secs}] ${seg.text}`;
    })
    .join("\n");
}

export async function transcribeAudioOnServer({
  base44,
  userId,
  quoteId,
  kind = "capture",
  fileUri,
  durationS,
  manualTranscript,
}) {
  enforceAiRateLimit(userId);

  let transcript = String(manualTranscript || "").trim();
  if (!transcript && fileUri) {
    const signedUrl = await signFileUriIfNeeded(base44, fileUri);
    if (!signedUrl) {
      throw new Error("Could not access uploaded audio recording.");
    }
    const rawResult = await base44.asServiceRole.integrations.Core.TranscribeAudio({
      audio_url: signedUrl,
    });
    transcript =
      typeof rawResult === "string"
        ? rawResult.trim()
        : String(rawResult?.text || "").trim();
  }

  const segments = buildTimedSegmentsFromTranscript(transcript, durationS);

  const recording = await base44.entities.Recording.create({
    quote_id: quoteId,
    kind,
    file_uri: fileUri || "",
    duration_s: Number(durationS) || 0,
    transcript,
    segments,
    status: "transcribed",
  });

  return { recording, transcript, segments };
}

const FillAreaSchema = z.object({
  start_segment: z.number().nullable().optional(),
  name: z.string().nullable().optional(),
  kind: z.enum(["interior", "exterior", "extra"]).nullable().optional(),
  length_m: z.number().nullable().optional(),
  width_m: z.number().nullable().optional(),
  stud_m: z.number().nullable().optional(),
  area_m2_spoken: z.number().nullable().optional(),
  soffits_m2: z.number().nullable().optional(),
  fascia_m: z.number().nullable().optional(),
  surfaces: z.array(z.string()).nullable().optional(),
  optional_surfaces: z.array(z.string()).nullable().optional(),
  doors: z.number().nullable().optional(),
  windows: z.number().nullable().optional(),
  coats: z.number().nullable().optional(),
  prep: z.enum(["light", "standard", "heavy"]).nullable().optional(),
  prep_notes: z.string().nullable().optional(),
  colour: z.string().nullable().optional(),
  spoken_price: z.number().nullable().optional(),
  optional_spoken_price: z.number().nullable().optional(),
  optional: z.boolean().nullable().optional(),
  same_as_area: z.string().nullable().optional(),
  needs_owner_price: z.boolean().nullable().optional(),
  customer_description: z.string().nullable().optional(),
});

const FillOutputSchema = z.object({
  client: z
    .object({
      name: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      address: z.string().nullable().optional(),
    })
    .optional(),
  areas: z.array(FillAreaSchema).default([]),
  deposit_pct: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  unclear: z.array(z.string()).default([]),
});

const FILL_JSON_SCHEMA = {
  type: "object",
  properties: {
    client: {
      type: "object",
      properties: {
        name: { type: ["string", "null"] },
        phone: { type: ["string", "null"] },
        email: { type: ["string", "null"] },
        address: { type: ["string", "null"] },
      },
    },
    areas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          start_segment: { type: ["integer", "null"] },
          name: { type: ["string", "null"] },
          kind: { type: ["string", "null"], enum: ["interior", "exterior", "extra", null] },
          length_m: { type: ["number", "null"] },
          width_m: { type: ["number", "null"] },
          stud_m: { type: ["number", "null"] },
          area_m2_spoken: { type: ["number", "null"] },
          soffits_m2: { type: ["number", "null"] },
          fascia_m: { type: ["number", "null"] },
          surfaces: {
            type: "array",
            items: {
              type: "string",
              enum: ["walls", "ceiling", "skirting", "weatherboards", "soffits", "fascia"],
            },
          },
          optional_surfaces: {
            type: "array",
            items: {
              type: "string",
              enum: ["walls", "ceiling", "skirting", "weatherboards", "soffits", "fascia"],
            },
          },
          doors: { type: ["integer", "null"] },
          windows: { type: ["integer", "null"] },
          coats: { type: ["integer", "null"] },
          prep: { type: ["string", "null"], enum: ["light", "standard", "heavy", null] },
          prep_notes: { type: ["string", "null"] },
          colour: { type: ["string", "null"] },
          spoken_price: { type: ["number", "null"] },
          optional_spoken_price: { type: ["number", "null"] },
          optional: { type: ["boolean", "null"] },
          same_as_area: { type: ["string", "null"] },
          needs_owner_price: { type: ["boolean", "null"] },
          customer_description: { type: ["string", "null"] },
        },
      },
    },
    deposit_pct: { type: ["number", "null"] },
    notes: { type: ["string", "null"] },
    unclear: { type: "array", items: { type: "string" } },
  },
  required: ["client", "areas", "unclear"],
};

export async function extractQuoteStructureWithRetry({
  base44,
  userId,
  segments,
  photoTimes = [],
  defaultStudM = 2.4,
}) {
  enforceAiRateLimit(userId);
  const formattedSegments = formatSegmentsForPrompt(segments);
  const photoLine =
    photoTimes.length > 0
      ? `Photos snapped at seconds: ${photoTimes.map((t) => `${Number(t).toFixed(1)}s`).join(", ")}`
      : "No photos snapped.";

  const prompt = `You are structuring a New Zealand painter & decorator's property walk recording into JSON for a quote.
NZ painter vocabulary: ${PAINTER_VOCAB_PROMPT}.

HOW PAINTERS SAY NUMBERS:
- Dimensions: "five by four" = 5 x 4 m; "four point two by three" = 4.2 x 3; "eight by one-two" = 8 x 1.2.
- Stud: "stud two-four" or "two point four stud" = 2.4 m; "two-seven" = 2.7; "three metre stud" = 3.
- Prices: "eleven hundred" = 1100; "four fifty" = 450; "one ninety" = 190; "twelve fifty" = 1250; "two grand" = 2000; "one point five k" = 1500.
- Counts: "two coats" = 2; "a window" = 1.

STRICT RULES:
1. Output JSON only matching the schema: { client, areas[], deposit_pct, notes, unclear[] }.
2. Fill ONLY what was said. Never invent, estimate or calculate dimensions, areas or prices, and never work out m² yourself.
2b. A number is a price only when it is said as the cost of an area ("..., eleven hundred", "four hundred for the hallway"). Dimensions, stud heights, coats, counts and percentages are never prices. If unsure whether a number was a price, set spoken_price: null and add a note to unclear[].
3. Dimensions in metres: "five by four" => length_m: 5, width_m: 4; "stud two-four" => stud_m: 2.4; "eight by one-two" => length_m: 8, width_m: 1.2.
4. A stated total area ("about one-eighty square metres") goes in area_m2_spoken: 180. For an exterior, area_m2_spoken is the weatherboard / wall cladding area only.
4b. Soffits and fascia are measured separately. A spoken soffit area ("soffits about thirty square metres") goes in soffits_m2: 30. A spoken fascia length in metres ("sixty metres of fascia") goes in fascia_m: 60. NEVER copy area_m2_spoken into soffits_m2 or fascia_m, and NEVER put square metres in fascia_m. If soffits or fascia are included but not measured, include them in surfaces and leave soffits_m2 / fascia_m null.
5. If stud height is NOT explicitly said for an interior room, set stud_m: null AND add a short note in unclear[] (e.g. "Hallway: stud height not spoken").
6. Copy spoken prices EXACTLY as numbers ("eleven hundred" = 1100, "four hundred" = 400). NEVER estimate or guess a price! If no price was spoken, set spoken_price: null.
7. One object per room or exterior area in spoken order. Set start_segment to the integer index <i> from [s<i> m:ss] where that room starts.
8. If the speaker says "same as the lounge" (or another room), set same_as_area: "Lounge" AND copy that area's surfaces, coats, and prep unless overridden.
9. prep: "light" ("freshen up", "quick coat"), "heavy" ("lots of filling", "peeling", "strip wallpaper", "bare timber"), otherwise "standard".
10. Mark optional: if the entire area is optional, set optional: true. If only a specific surface in a room is optional (e.g. "Hallway, walls only, ceiling optional, four hundred"), include both in surfaces (["walls","ceiling"]), put ["ceiling"] in optional_surfaces, put 400 in spoken_price, and any spoken optional price in optional_spoken_price (or null if none spoken).
11. customer_description: ONE plain-English homeowner sentence using New Zealand spelling (colour, metres, undercoat, mould) WITHOUT any dollar prices or emojis.
12. doors and windows only when a count is said; otherwise null.
13. deposit_pct only when a deposit percentage is said ("thirty percent deposit" = 30), as a whole percentage, never a fraction.
14. Client: name, phone, email and address exactly as said.
15. unclear[]: one short line per specific problem, naming the area (e.g. "Lounge: price not clear"). No generic notes.
16. Any spoken language in, English out.

TRANSCRIPT SEGMENTS:
${formattedSegments || "[s0 0:00] (empty recording)"}

${photoLine}`;

  let parsed = null;
  let lastErr = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: FILL_JSON_SCHEMA,
      });
      const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
      parsed = FillOutputSchema.parse(obj);
      break;
    } catch (err) {
      lastErr = err;
    }
  }

  if (!parsed) {
    throw lastErr || new Error("Could not parse property walk into room items.");
  }

  return postProcessExtraction(parsed, {
    transcript: segments.map((seg) => seg.text).join(" "),
    defaultStudM,
  });
}

export async function saveVersionSnapshot(base44, quoteId, reason) {
  const quote = await base44.entities.Quote.get(quoteId);
  const itemsPage = await base44.entities.QuoteItem.filter(
    { quote_id: quoteId },
    { sort: "area_number", limit: 100 }
  );
  const photosPage = await base44.entities.Photo.filter(
    { quote_id: quoteId },
    { sort: "taken_at_s", limit: 100 }
  );

  return await base44.entities.QuoteVersion.create({
    quote_id: quoteId,
    reason,
    snapshot: {
      quote: {
        client_name: quote.client_name || "",
        client_phone: quote.client_phone || "",
        client_email: quote.client_email || "",
        address: quote.address || "",
        deposit_pct: quote.deposit_pct || 0,
        notes: quote.notes || "",
        unclear: quote.unclear || [],
        subtotal_excl_gst: quote.subtotal_excl_gst || 0,
        gst_amount: quote.gst_amount || 0,
        total_incl_gst: quote.total_incl_gst || 0,
        subtotal: quote.subtotal || 0,
        tax_amount: quote.tax_amount || 0,
        total: quote.total || 0,
        deposit_amount: quote.deposit_amount || 0,
      },
      items: (itemsPage.items || []).map((it) => ({
        area_number: it.area_number,
        name: it.name,
        kind: it.kind,
        length_m: it.length_m,
        width_m: it.width_m,
        stud_m: it.stud_m,
        area_m2_spoken: it.area_m2_spoken,
        soffits_m2: it.soffits_m2 ?? null,
        fascia_m: it.fascia_m ?? null,
        surfaces: it.surfaces || [],
        doors: it.doors || 0,
        windows: it.windows || 0,
        coats: it.coats || 2,
        prep: it.prep || "standard",
        prep_notes: it.prep_notes || "",
        colour: it.colour || "",
        spoken_price: it.spoken_price,
        price: it.price,
        price_book_estimate: it.price_book_estimate,
        price_source: it.price_source,
        optional: Boolean(it.optional),
        is_optional_split: Boolean(it.is_optional_split),
        needs_owner_price: Boolean(it.needs_owner_price),
        flagged: Boolean(it.flagged),
        customer_description: it.customer_description || "",
        start_segment: it.start_segment,
      })),
      photos: (photosPage.items || []).map((p) => ({
        id: p.id,
        area_number: p.area_number,
        file_uri: p.file_uri,
        taken_at_s: p.taken_at_s,
        pin_x: p.pin_x,
        pin_y: p.pin_y,
      })),
    },
  });
}

const EDIT_JSON_SCHEMA = {
  type: "object",
  properties: {
    changes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          op: { type: "string", enum: ["set", "add_area", "remove_area"] },
          area: {
            anyOf: [{ type: "integer" }, { type: "string" }, { type: "null" }],
          },
          field: { type: ["string", "null"] },
          value: {
            anyOf: [
              { type: "string" },
              { type: "number" },
              { type: "boolean" },
              { type: "array", items: { type: "string" } },
              { type: "object", additionalProperties: true },
              { type: "null" },
            ],
          },
          evidence: { type: ["string", "null"] },
        },
        required: ["op"],
      },
    },
    unclear: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["changes", "unclear"],
};

/** Phase 1 of a voice edit: works out what the painter asked for. Writes nothing. */
export async function proposeVoiceEdit({ base44, userId, quote, items, editTranscript }) {
  enforceAiRateLimit(userId);

  const areaList = items.map((it) => ({
    area: it.area_number,
    name: it.name,
    optional_part: Boolean(it.is_optional_split),
    kind: it.kind,
    length_m: it.length_m,
    width_m: it.width_m,
    stud_m: it.stud_m,
    area_m2_spoken: it.area_m2_spoken,
    soffits_m2: it.soffits_m2 ?? null,
    fascia_m: it.fascia_m ?? null,
    surfaces: it.surfaces,
    doors: it.doors,
    windows: it.windows,
    coats: it.coats,
    prep: it.prep,
    colour: it.colour,
    optional: it.optional,
    price: it.price,
  }));

  const prompt = `You are turning a painter's spoken change into precise edits on an existing New Zealand painting quote.
Vocabulary: ${PAINTER_VOCAB_PROMPT}.
Spoken numbers: "four fifty" = 450, "eleven hundred" = 1100, "two grand" = 2000, stud "two-four" = 2.4.

CURRENT QUOTE:
${JSON.stringify(
  {
    client_name: quote.client_name,
    client_phone: quote.client_phone,
    client_email: quote.client_email,
    address: quote.address,
    deposit_pct: quote.deposit_pct,
    notes: quote.notes,
    areas: areaList,
  },
  null,
  2
)}

PAINTER'S CHANGE:
"${editTranscript}"

RULES:
1. Return JSON { "changes": [...], "unclear": [...] }.
2. Ops:
   - { "op": "set", "area": <area number or exact area name, or null for quote-level>, "field": "<field>", "value": <value>, "evidence": "<exact words from the change>" }
   - { "op": "add_area", "value": { "name", "kind", "length_m", "width_m", "stud_m", "area_m2_spoken", "soffits_m2", "fascia_m", "surfaces", "coats", "prep", "colour", "spoken_price", "optional" }, "evidence": "..." }
   - { "op": "remove_area", "area": <area number or name>, "evidence": "..." }
3. Use the area number from CURRENT QUOTE when you can. For an optional part (e.g. "Hallway — Ceiling") use its exact name.
4. If a reference could mean more than one area, make NO change for it and add a question to unclear[] naming the options.
5. Change only what was asked, one change per field. Never alter other areas.
6. Quote-level fields: client_name, client_phone, client_email, address, deposit_pct, notes.
7. Area fields: name, kind, length_m, width_m, stud_m, area_m2_spoken, soffits_m2, fascia_m, surfaces, optional_surfaces, doors, windows, coats, prep, prep_notes, colour, spoken_price, optional, customer_description.
8. area_m2_spoken is the weatherboard / wall m². soffits_m2 is soffit m². fascia_m is fascia in linear metres. Never copy one measurement into another.
9. A new price goes in spoken_price, copied exactly as said. Never calculate or invent a price.
10. "Make the lounge ceiling optional" = set optional_surfaces ["ceiling"] on the Lounge.
11. surfaces values: walls, ceiling, skirting, weatherboards, soffits, fascia. prep values: light, standard, heavy.
12. evidence must be copied word for word from the painter's change.
13. Anything you can't map confidently goes in unclear[] with no change.`;

  let parsed = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: EDIT_JSON_SCHEMA,
      });
      const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (obj && Array.isArray(obj.changes)) {
        parsed = obj;
        break;
      }
    } catch {
      // retry once
    }
  }

  if (!parsed) {
    throw new Error("Couldn't work out that change. Try saying it another way.");
  }

  return buildEditProposal({
    rawChanges: parsed.changes,
    rawUnclear: Array.isArray(parsed.unclear) ? parsed.unclear : [],
    quote,
    items,
    transcript: editTranscript,
  });
}

const ITEM_WRITE_FIELDS = [
  "name",
  "kind",
  "length_m",
  "width_m",
  "stud_m",
  "area_m2_spoken",
  "soffits_m2",
  "fascia_m",
  "surfaces",
  "doors",
  "windows",
  "coats",
  "prep",
  "prep_notes",
  "colour",
  "optional",
  "is_optional_split",
  "spoken_price",
  "price",
  "price_book_estimate",
  "price_source",
  "flagged",
  "needs_owner_price",
  "customer_description",
];

function itemWritePayload(item) {
  return Object.fromEntries(ITEM_WRITE_FIELDS.map((key) => [key, item[key] ?? null]));
}

/** Phase 2: applies only the changes the painter confirmed, with an undo snapshot. */
export async function applyConfirmedVoiceEdit({
  base44,
  quote,
  items,
  business,
  changes,
  transcript = "",
  extraUnclear = [],
}) {
  const bizSettings = getBusinessSettings(business);
  const confirmed = validateConfirmedChanges(changes, { quote, items });
  const sim = simulateEditChanges({
    items,
    changes: confirmed,
    priceBook: business?.price_book || null,
    settings: bizSettings,
  });

  const version = await saveVersionSnapshot(base44, quote.id, "voice_edit");

  for (const id of sim.removedIds) {
    await base44.entities.QuoteItem.delete(id);
  }
  const finalItems = [];
  for (const item of sim.items) {
    if (item.isNew) {
      finalItems.push(
        await base44.entities.QuoteItem.create({
          ...itemWritePayload(item),
          quote_id: quote.id,
          area_number: item.area_number,
          start_segment: null,
        })
      );
    } else {
      if (sim.updatedIds.has(item.id)) {
        await base44.entities.QuoteItem.update(item.id, itemWritePayload(item));
      }
      finalItems.push(item);
    }
  }

  const touched = sim.items.filter((it) => it.isNew || sim.updatedIds.has(it.id));
  const quotePatch = {
    ...sim.quotePatch,
    unclear: pruneResolvedMeasurementNotes(
      mergeUnclearNotes(
        quote.unclear || [],
        extraUnclear,
        describeMissingMeasurements(touched, bizSettings)
      ),
      finalItems,
      bizSettings
    ),
  };

  const totals = calculateQuoteTotals({
    items: finalItems,
    tickedOptionalIds: quote.selected_optional_ids || [],
    minCharge: bizSettings.min_charge,
    gstRate: bizSettings.gst_rate,
    pricesIncludeGst: bizSettings.prices_include_gst,
    depositPct: quotePatch.deposit_pct ?? quote.deposit_pct ?? 0,
  });

  await base44.entities.Quote.update(quote.id, {
    ...quotePatch,
    subtotal_excl_gst: totals.subtotalExclGst,
    gst_amount: totals.gstAmount,
    total_incl_gst: totals.totalInclGst,
    subtotal: totals.subtotalExclGst,
    tax_amount: totals.gstAmount,
    total: totals.totalInclGst,
    deposit_amount: totals.depositAmount,
  });

  await base44.entities.QuoteEvent.create({
    quote_id: quote.id,
    type: "edited",
    meta: { transcript, changedFields: sim.changedFields },
  });

  return { versionId: version.id, changedFields: sim.changedFields };
}

/** One-step edit used by the /api/edit route: applies every clear change. */
export async function applyVoiceEditWithRetry({
  base44,
  userId,
  quote,
  items,
  business,
  editTranscript,
}) {
  const proposal = await proposeVoiceEdit({ base44, userId, quote, items, editTranscript });
  if (proposal.changes.length === 0) {
    return { changedFields: [], versionId: null, unclearAdded: proposal.clarifications };
  }
  const res = await applyConfirmedVoiceEdit({
    base44,
    quote,
    items,
    business,
    changes: proposal.changes,
    transcript: editTranscript,
    extraUnclear: proposal.clarifications,
  });
  return { ...res, unclearAdded: proposal.clarifications };
}

export async function notifyOwnerByEmail({
  base44,
  toEmail,
  subject,
  heading,
  detailLines = [],
}) {
  if (!toEmail) return;
  try {
    const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:540px;margin:0 auto;padding:24px;color:#1d1d1f;">
      <p style="font-size:12px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:#163a2c;margin:0 0 8px;">Notch Quote Update</p>
      <h2 style="font-size:22px;margin:0 0 14px;">${heading}</h2>
      ${detailLines
        .map(
          (l) =>
            `<p style="font-size:15px;line-height:1.5;margin:6px 0;color:#3f3f46;">${l}</p>`
        )
        .join("")}
    </div>`;
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: toEmail,
      subject,
      html,
      category: "transactional",
    });
  } catch {
    // Notification failure never blocks homeowner quote view/accept
  }
}

export async function createFollowUpSmsText({
  base44,
  userId,
  businessName,
  clientName,
  address,
  total,
  currency = "NZD",
}) {
  enforceAiRateLimit(userId);
  const formattedTotal = formatMoney(total, currency);
  const prompt = `Write a brief, friendly New Zealand English text message from ${businessName || "our painting team"} following up with homeowner ${clientName || "there"} about the painting quote we sent for ${address || "your property"} (${formattedTotal} incl. GST).
STRICT RULES:
- Under 220 characters total.
- Natural NZ English, warm and low-pressure.
- NO emojis, NO hashtags, NO markdown quotes.`;

  const raw = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
  const cleaned = String(raw || "")
    .replace(/^["']|["']$/g, "")
    .replace(/[\p{Extended_Pictographic}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.slice(0, 238);
}