import crypto from "node:crypto";
import { z } from "zod";
import {
  ALL_SURFACES,
  SURFACE_LABELS,
  calculateQuoteTotals,
  expandAreasToQuoteItems,
  formatMoney,
  priceSingleItem,
} from "@/lib/pricing";

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

  const prompt = `You are structuring a New Zealand painter & decorator property walk recording into JSON.
NZ Painter vocabulary reference: ${PAINTER_VOCAB_PROMPT}.

STRICT RULES:
1. Output JSON only matching the schema: { client, areas[], deposit_pct, notes, unclear[] }.
2. Fill ONLY what was said. Never invent dimensions or prices.
3. Dimensions in metres: "five by four" => length_m: 5, width_m: 4; "stud two-four" => stud_m: 2.4; "eight by one-two" => length_m: 8, width_m: 1.2.
4. A stated total area ("about one-eighty square metres") goes in area_m2_spoken: 180.
5. If stud height is NOT explicitly said for an interior room, set stud_m: null AND add a short note in unclear[] (e.g. "Hallway: stud height not spoken").
6. Copy spoken prices EXACTLY as numbers ("eleven hundred" = 1100, "four hundred" = 400). NEVER estimate or guess a price! If no price was spoken, set spoken_price: null.
7. One object per room or exterior area in spoken order. Set start_segment to the integer index <i> from [s<i> m:ss] where that room starts.
8. If the speaker says "same as the lounge" (or another room), set same_as_area: "Lounge" AND copy that area's surfaces, coats, and prep unless overridden.
9. prep: "light" ("freshen up", "quick coat"), "heavy" ("lots of filling", "peeling", "strip wallpaper", "bare timber"), otherwise "standard".
10. Mark optional: if the entire area is optional, set optional: true. If only a specific surface in a room is optional (e.g. "Hallway, walls only, ceiling optional, four hundred"), include both in surfaces (["walls","ceiling"]), put ["ceiling"] in optional_surfaces, put 400 in spoken_price, and any spoken optional price in optional_spoken_price (or null if none spoken).
11. customer_description: ONE plain-English homeowner sentence using New Zealand spelling (colour, metres, undercoat, mould) WITHOUT any dollar prices or emojis.
12. Any spoken language in, English out. Anything uncertain or ambiguous goes in unclear[].

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

  // Post-process "same as <room>" inheritance and guarantee missing interior stud note in unclear[]
  const unclearSet = new Set(parsed.unclear || []);
  const resolvedAreas = [];

  for (const area of parsed.areas) {
    const next = { ...area };
    if (next.same_as_area) {
      const targetName = next.same_as_area.trim().toLowerCase().replace(/^the\s+/, "");
      const ref =
        resolvedAreas.find((a) => (a.name || "").toLowerCase().includes(targetName)) ||
        resolvedAreas[resolvedAreas.length - 1];
      if (ref) {
        if (!next.surfaces || next.surfaces.length === 0) next.surfaces = ref.surfaces;
        if (!next.coats) next.coats = ref.coats;
        if (!next.prep) next.prep = ref.prep;
        if (!next.colour && ref.colour) next.colour = ref.colour;
      }
    }

    const kind = next.kind || "interior";
    const surfs = Array.isArray(next.surfaces) ? next.surfaces : ["walls"];
    if (kind === "interior" && surfs.includes("walls") && next.stud_m == null) {
      const label = next.name || `Area ${resolvedAreas.length + 1}`;
      const alreadyNoted = [...unclearSet].some(
        (u) => u.toLowerCase().includes(label.toLowerCase()) && u.toLowerCase().includes("stud")
      );
      if (!alreadyNoted) {
        unclearSet.add(
          `${label}: stud height not stated (wall m² shown using ${defaultStudM} m default stud)`
        );
      }
    }

    resolvedAreas.push(next);
  }

  return {
    ...parsed,
    areas: resolvedAreas,
    unclear: [...unclearSet],
  };
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

const ALLOWED_QUOTE_FIELDS = new Set([
  "client_name",
  "client_phone",
  "client_email",
  "address",
  "deposit_pct",
  "notes",
]);

const ALLOWED_AREA_FIELDS = new Set([
  "name",
  "kind",
  "length_m",
  "width_m",
  "stud_m",
  "area_m2_spoken",
  "surfaces",
  "optional_surfaces",
  "doors",
  "windows",
  "coats",
  "prep",
  "prep_notes",
  "colour",
  "spoken_price",
  "price",
  "optional",
  "customer_description",
]);

function findTargetItemIndex(workingItems, areaRef) {
  if (areaRef == null || areaRef === "") return -1;
  const asNum = Number(areaRef);
  if (Number.isFinite(asNum) && asNum > 0) {
    const mainIdx = workingItems.findIndex(
      (it) => Number(it.area_number) === asNum && !it.is_optional_split
    );
    if (mainIdx !== -1) return mainIdx;
    return workingItems.findIndex((it) => Number(it.area_number) === asNum);
  }

  const needle = String(areaRef)
    .toLowerCase()
    .trim()
    .replace(/^(the|room|area)\s+/i, "");

  if (!needle) return -1;

  const asksOptionalSub =
    needle.includes("ceiling") || needle.includes("optional") || needle.includes("skirting");

  if (asksOptionalSub) {
    const optMatch = workingItems.findIndex(
      (it) => it.is_optional_split && (it.name || "").toLowerCase().includes(needle.split(" ")[0])
    );
    if (optMatch !== -1) return optMatch;
  }

  const exactMain = workingItems.findIndex(
    (it) => !it.is_optional_split && (it.name || "").toLowerCase().trim() === needle
  );
  if (exactMain !== -1) return exactMain;

  const partialMain = workingItems.findIndex(
    (it) => !it.is_optional_split && (it.name || "").toLowerCase().includes(needle)
  );
  if (partialMain !== -1) return partialMain;

  return workingItems.findIndex((it) => (it.name || "").toLowerCase().includes(needle));
}

export async function applyVoiceEditWithRetry({
  base44,
  userId,
  quote,
  items,
  business,
  editTranscript,
}) {
  enforceAiRateLimit(userId);
  const bizSettings = getBusinessSettings(business);
  const priceBook = business?.price_book || null;

  const areasSummary = items.map((it) => ({
    area_number: it.area_number,
    name: it.name,
    is_optional_split: Boolean(it.is_optional_split),
    kind: it.kind,
    length_m: it.length_m,
    width_m: it.width_m,
    stud_m: it.stud_m,
    area_m2_spoken: it.area_m2_spoken,
    surfaces: it.surfaces,
    doors: it.doors,
    windows: it.windows,
    coats: it.coats,
    prep: it.prep,
    colour: it.colour,
    optional: it.optional,
    price: it.price,
    customer_description: it.customer_description,
  }));

  const prompt = `You are applying a spoken painter's edit to an existing New Zealand painting quote.
Vocabulary: ${PAINTER_VOCAB_PROMPT}.

CURRENT QUOTE:
${JSON.stringify(
  {
    client_name: quote.client_name,
    client_phone: quote.client_phone,
    client_email: quote.client_email,
    address: quote.address,
    deposit_pct: quote.deposit_pct,
    notes: quote.notes,
    areas: areasSummary,
  },
  null,
  2
)}

PAINTER SPOKEN EDIT:
"${editTranscript}"

STRICT RULES:
1. Return JSON { "changes": [...], "unclear": [...] }.
2. Ops allowed:
   - { "op": "set", "area": <number or room name or null for quote-level>, "field": "<field>", "value": <value> }
   - { "op": "add_area", "value": { "name", "kind", "length_m", "width_m", "stud_m", "area_m2_spoken", "surfaces", "coats", "prep", "colour", "spoken_price", "optional", "customer_description" } }
   - { "op": "remove_area", "area": <number or room name> }
3. Areas can be referenced by number (1, 2) OR by room name ("Lounge", "Hallway", "Hallway — Ceiling").
4. Change ONLY what was asked. Never alter other rooms or fields.
5. Quote-level fields (set area: null): client_name, client_phone, client_email, address, deposit_pct, notes.
6. Area-level fields: name, kind, length_m, width_m, stud_m, area_m2_spoken, surfaces, optional_surfaces, doors, windows, coats, prep, prep_notes, colour, spoken_price, optional, customer_description.
7. When the painter states a new price ("hallway is four fifty"), set field: "spoken_price", value: 450. Copy spoken numbers verbatim; never invent prices.
8. If the painter asks to make a specific surface optional (e.g. "make lounge ceiling optional"), set field: "optional_surfaces", value: ["ceiling"].
9. Anything ambiguous goes into unclear[] with NO change applied for that ambiguous part.`;

  let parsed = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: EDIT_JSON_SCHEMA,
      });
      const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (obj && Array.isArray(obj.changes)) {
        parsed = {
          changes: obj.changes,
          unclear: Array.isArray(obj.unclear) ? obj.unclear.map(String) : [],
        };
        break;
      }
    } catch {
      // retry once
    }
  }

  if (!parsed) {
    throw new Error("Could not interpret spoken change. Try phrasing it again.");
  }

  const version = await saveVersionSnapshot(base44, quote.id, "voice_edit");
  const changedFields = [];
  const quotePatch = {};
  let workingItems = [...items];

  for (const change of parsed.changes) {
    if (
      change.op === "set" &&
      (change.area == null || change.area === "") &&
      change.field &&
      ALLOWED_QUOTE_FIELDS.has(change.field)
    ) {
      quotePatch[change.field] = change.value;
      changedFields.push(`quote:${change.field}`);
    } else if (
      change.op === "set" &&
      change.area != null &&
      change.field &&
      ALLOWED_AREA_FIELDS.has(change.field)
    ) {
      const idx = findTargetItemIndex(workingItems, change.area);
      if (idx === -1) continue;

      const target = { ...workingItems[idx] };
      const areaNum = target.area_number;
      const field = change.field;

      if (field === "spoken_price" || field === "price") {
        const num = change.value == null ? null : Number(change.value);
        target.spoken_price = num;
        target.price_source = num != null ? "spoken" : "none";
        const repriced = priceSingleItem(target, priceBook, bizSettings);
        workingItems[idx] = repriced;
        await base44.entities.QuoteItem.update(repriced.id, {
          spoken_price: repriced.spoken_price,
          price: repriced.price,
          price_book_estimate: repriced.price_book_estimate,
          price_source: repriced.price_source,
          flagged: repriced.flagged,
        });
        changedFields.push(`area:${areaNum}:price`);
      } else if (field === "optional_surfaces" && Array.isArray(change.value)) {
        const optSurfs = change.value.filter((s) => ALL_SURFACES.includes(s));
        if (optSurfs.length > 0) {
          target.surfaces = (target.surfaces || []).filter((s) => !optSurfs.includes(s));
          const repricedMain = priceSingleItem(target, priceBook, bizSettings);
          workingItems[idx] = repricedMain;
          await base44.entities.QuoteItem.update(repricedMain.id, {
            surfaces: repricedMain.surfaces,
            price: repricedMain.price,
            price_book_estimate: repricedMain.price_book_estimate,
            price_source: repricedMain.price_source,
            flagged: repricedMain.flagged,
          });

          const existingOpt = workingItems.find(
            (it) => it.area_number === areaNum && it.is_optional_split
          );
          if (!existingOpt) {
            const labelSuffix = optSurfs.map((s) => SURFACE_LABELS[s] || s).join(" & ");
            const optDraft = priceSingleItem(
              {
                quote_id: quote.id,
                area_number: areaNum,
                name: `${repricedMain.name} — ${labelSuffix}`,
                kind: repricedMain.kind,
                length_m: repricedMain.length_m,
                width_m: repricedMain.width_m,
                stud_m: repricedMain.stud_m,
                area_m2_spoken: null,
                surfaces: optSurfs,
                doors: 0,
                windows: 0,
                coats: repricedMain.coats,
                prep: repricedMain.prep,
                colour: repricedMain.colour || "",
                spoken_price: null,
                optional: true,
                is_optional_split: true,
                customer_description: `Prepare and apply ${repricedMain.coats || 2} coats to ${(repricedMain.name || "room").toLowerCase()} ${optSurfs.join(" and ")}.`,
              },
              priceBook,
              bizSettings
            );
            const createdOpt = await base44.entities.QuoteItem.create(optDraft);
            workingItems.push(createdOpt);
          }
          changedFields.push(`area:${areaNum}:surfaces`);
        }
      } else {
        target[field] = change.value;
        const repriced = priceSingleItem(target, priceBook, bizSettings);
        workingItems[idx] = repriced;
        await base44.entities.QuoteItem.update(repriced.id, {
          [field]: repriced[field],
          price: repriced.price,
          price_book_estimate: repriced.price_book_estimate,
          price_source: repriced.price_source,
          flagged: repriced.flagged,
        });
        changedFields.push(`area:${areaNum}:${field}`);
      }
    } else if (change.op === "add_area" && change.value && typeof change.value === "object") {
      const nextNum =
        workingItems.reduce((max, it) => Math.max(max, Number(it.area_number) || 0), 0) + 1;
      const expanded = expandAreasToQuoteItems(
        [{ ...change.value, area_number: nextNum }],
        priceBook,
        bizSettings
      );
      for (const draft of expanded) {
        const created = await base44.entities.QuoteItem.create({
          ...draft,
          quote_id: quote.id,
        });
        workingItems.push(created);
      }
      changedFields.push(`area:${nextNum}:added`);
    } else if (change.op === "remove_area" && change.area != null) {
      const idx = findTargetItemIndex(workingItems, change.area);
      if (idx !== -1) {
        const areaNum = workingItems[idx].area_number;
        const toRemove = workingItems.filter((it) => it.area_number === areaNum);
        for (const rem of toRemove) {
          if (rem.id) await base44.entities.QuoteItem.delete(rem.id);
        }
        workingItems = workingItems.filter((it) => it.area_number !== areaNum);
        changedFields.push(`area:${areaNum}:removed`);
      }
    }
  }

  if (parsed.unclear.length > 0) {
    quotePatch.unclear = [...(quote.unclear || []), ...parsed.unclear];
  }

  const totals = calculateQuoteTotals({
    items: workingItems,
    tickedOptionalIds: quote.selected_optional_ids || [],
    minCharge: bizSettings.min_charge,
    gstRate: bizSettings.gst_rate,
    pricesIncludeGst: bizSettings.prices_include_gst,
    depositPct: quotePatch.deposit_pct ?? quote.deposit_pct ?? 0,
  });

  const updatedQuote = await base44.entities.Quote.update(quote.id, {
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
    meta: { transcript: editTranscript, changedFields },
  });

  return {
    quote: updatedQuote,
    items: workingItems,
    changedFields,
    versionId: version.id,
    unclearAdded: parsed.unclear,
  };
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