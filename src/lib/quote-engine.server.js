import crypto from "node:crypto";
import { z } from "zod";
import {
  calculateQuoteTotals,
  expandTreesToQuoteItems,
  formatMoney,
  inferSizeClass,
  matchPhotosToItems,
  priceSingleItem,
} from "@/lib/pricing";

export const ARBORIST_VOCAB_PROMPT =
  "stump grind, crown reduction, deadwood, rigging, bucket truck, crane, live oak, silver maple, loblolly pine";

const AI_RATE_WINDOW_MS = 60_000;
const AI_RATE_MAX_PER_MIN = 12;
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
  return crypto.randomBytes(18).toString("base64url"); // 24 URL-safe random chars
}

export function isTrialExpired(business) {
  if (!business) return false;
  if (business.plan === "active") return false;
  if (!business.trial_started_at) return false;
  const startedMs = Date.parse(business.trial_started_at);
  if (!Number.isFinite(startedMs)) return false;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - startedMs > sevenDaysMs;
}

export function getTrialDaysLeft(business) {
  if (!business || business.plan === "active") return null;
  if (!business.trial_started_at) return 7;
  const startedMs = Date.parse(business.trial_started_at);
  if (!Number.isFinite(startedMs)) return 7;
  const elapsedDays = (Date.now() - startedMs) / (24 * 60 * 60 * 1000);
  return Math.max(0, Math.ceil(7 - elapsedDays));
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
    if (words.length <= 22) {
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

export async function transcribeAudioOnServer({ base44, userId, quoteId, kind = "capture", fileUri, durationS, manualTranscript }) {
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
    transcript = typeof rawResult === "string" ? rawResult.trim() : String(rawResult?.text || "").trim();
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

const FillTreeSchema = z.object({
  start_segment: z.number().nullable().optional(),
  label: z.string().nullable().optional(),
  species: z.string().nullable().optional(),
  height_ft: z.number().nullable().optional(),
  size_class: z.enum(["small", "medium", "large", "xl"]).nullable().optional(),
  work: z.enum(["remove", "trim", "crown_reduce", "deadwood", "stump_grind"]).nullable().optional(),
  hazards: z.array(z.string()).nullable().optional(),
  stump: z.enum(["grind", "optional", "leave"]).nullable().optional(),
  stump_spoken_price: z.number().nullable().optional(),
  haul: z.boolean().nullable().optional(),
  optional: z.boolean().nullable().optional(),
  spoken_price: z.number().nullable().optional(),
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
  trees: z.array(FillTreeSchema).default([]),
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
    trees: {
      type: "array",
      items: {
        type: "object",
        properties: {
          start_segment: { type: ["integer", "null"] },
          label: { type: ["string", "null"] },
          species: { type: ["string", "null"] },
          height_ft: { type: ["number", "null"] },
          size_class: { type: ["string", "null"], enum: ["small", "medium", "large", "xl", null] },
          work: {
            type: ["string", "null"],
            enum: ["remove", "trim", "crown_reduce", "deadwood", "stump_grind", null],
          },
          hazards: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "near_structure",
                "over_fence",
                "leaning",
                "dead_or_decayed",
                "no_truck_access",
                "power_lines",
              ],
            },
          },
          stump: { type: ["string", "null"], enum: ["grind", "optional", "leave", null] },
          stump_spoken_price: { type: ["number", "null"] },
          haul: { type: ["boolean", "null"] },
          optional: { type: ["boolean", "null"] },
          spoken_price: { type: ["number", "null"] },
          needs_owner_price: { type: ["boolean", "null"] },
          customer_description: { type: ["string", "null"] },
        },
      },
    },
    deposit_pct: { type: ["number", "null"] },
    notes: { type: ["string", "null"] },
    unclear: { type: "array", items: { type: "string" } },
  },
  required: ["client", "trees", "unclear"],
};

export async function extractQuoteStructureWithRetry({ base44, userId, segments, photoTimes = [] }) {
  enforceAiRateLimit(userId);
  const formattedSegments = formatSegmentsForPrompt(segments);
  const photoLine =
    photoTimes.length > 0
      ? `Photos snapped at seconds: ${photoTimes.map((t) => `${Number(t).toFixed(1)}s`).join(", ")}`
      : "No photos snapped.";

  const prompt = `You are structuring a residential tree service yard walk recording into JSON.
Arborist vocabulary reference: ${ARBORIST_VOCAB_PROMPT}.

STRICT RULES:
1. Output JSON only matching the schema.
2. Fill ONLY what was actually said. Leave unmentioned fields null.
3. Copy spoken prices EXACTLY as numbers ("fourteen hundred" = 1400, "nine fifty" = 950). NEVER estimate, guess, or invent a price! If no price was spoken for a tree, set spoken_price to null.
4. Create one object per tree in spoken order. Set start_segment to the integer index <i> from [s<i> m:ss] where that tree starts being discussed.
5. If the speaker says "same as the last one", copy the previous tree's work, size_class, stump, haul, and spoken_price unless changed.
6. stump must be "grind", "optional", or "leave". If stump grinding is offered as an optional add-on, set stump = "optional" and put any spoken stump add-on price in stump_spoken_price.
7. size_class: "small" (<30ft), "medium" (30-60ft), "large" (60-80ft), "xl" (>80ft).
8. Only include hazards explicitly said or clearly implied from: near_structure, over_fence, leaning, dead_or_decayed, no_truck_access, power_lines.
9. If power lines are mentioned on a tree with no spoken price, set needs_owner_price = true.
10. Put anything uncertain, ambiguous, or possibly misheard (including numbers or addresses) as short plain strings inside unclear[].
11. customer_description must be ONE plain-English homeowner-ready sentence describing the work on that tree WITHOUT any dollar prices or emojis.
12. Input speech may be English, Spanish, or mixed; always output English text.

TRANSCRIPT SEGMENTS:
${formattedSegments || "[s0 0:00] (empty recording)"}

${photoLine}`;

  let lastErr;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: FILL_JSON_SCHEMA,
      });
      const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
      return FillOutputSchema.parse(obj);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("Could not parse yard recording into quote items.");
}

export async function saveVersionSnapshot(base44, quoteId, reason) {
  const quote = await base44.entities.Quote.get(quoteId);
  const itemsPage = await base44.entities.QuoteItem.filter({ quote_id: quoteId }, { sort: "tree_number", limit: 100 });
  const photosPage = await base44.entities.Photo.filter({ quote_id: quoteId }, { sort: "taken_at_s", limit: 100 });
  const version = await base44.entities.QuoteVersion.create({
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
        subtotal: quote.subtotal || 0,
        tax_amount: quote.tax_amount || 0,
        total: quote.total || 0,
        deposit_amount: quote.deposit_amount || 0,
      },
      items: (itemsPage.items || []).map((it) => ({
        tree_number: it.tree_number,
        label: it.label,
        species: it.species,
        height_ft: it.height_ft,
        size_class: it.size_class,
        work: it.work,
        hazards: it.hazards || [],
        stump: it.stump,
        haul: it.haul,
        optional: it.optional,
        is_stump_line: it.is_stump_line,
        needs_owner_price: it.needs_owner_price,
        spoken_price: it.spoken_price,
        price: it.price,
        price_book_estimate: it.price_book_estimate,
        price_source: it.price_source,
        flagged: it.flagged,
        customer_description: it.customer_description,
        start_segment: it.start_segment,
      })),
      photos: (photosPage.items || []).map((p) => ({
        id: p.id,
        tree_number: p.tree_number,
        file_uri: p.file_uri,
        taken_at_s: p.taken_at_s,
        pin_x: p.pin_x,
        pin_y: p.pin_y,
      })),
    },
  });
  return version;
}

const EDIT_JSON_SCHEMA = {
  type: "object",
  properties: {
    changes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          op: { type: "string", enum: ["set", "add_tree", "remove_tree"] },
          tree: { type: ["integer", "null"] },
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

const ALLOWED_TREE_FIELDS = new Set([
  "label",
  "species",
  "height_ft",
  "size_class",
  "work",
  "hazards",
  "stump",
  "stump_spoken_price",
  "haul",
  "optional",
  "spoken_price",
  "price",
  "customer_description",
]);

export async function applyVoiceEditWithRetry({ base44, userId, quote, items, business, editTranscript }) {
  enforceAiRateLimit(userId);

  const mainTreesSummary = items.map((it) => ({
    tree_number: it.tree_number,
    is_stump_line: Boolean(it.is_stump_line),
    label: it.label,
    species: it.species,
    height_ft: it.height_ft,
    size_class: it.size_class,
    work: it.work,
    hazards: it.hazards,
    stump: it.stump,
    haul: it.haul,
    optional: it.optional,
    price: it.price,
    customer_description: it.customer_description,
  }));

  const prompt = `You are applying a spoken owner edit to an existing tree service quote.
CURRENT QUOTE:
${JSON.stringify(
  {
    client_name: quote.client_name,
    client_phone: quote.client_phone,
    client_email: quote.client_email,
    address: quote.address,
    deposit_pct: quote.deposit_pct,
    notes: quote.notes,
    trees: mainTreesSummary,
  },
  null,
  2
)}

OWNER SPOKEN EDIT:
"${editTranscript}"

RULES:
1. Return JSON { "changes": [...], "unclear": [...] }.
2. Trees are numbered from 1 using tree_number (e.g. "tree two" -> tree: 2).
3. Change ONLY what the owner asked to change. Never alter other trees or fields.
4. For quote-level fields, omit tree (or set tree: null) and use field in: client_name, client_phone, client_email, address, deposit_pct, notes.
5. For tree-level fields, set op: "set", tree: <number>, and field in: label, species, height_ft, size_class, work, hazards, stump ("grind"|"optional"|"leave"), stump_spoken_price, haul, optional, spoken_price, customer_description.
6. When the owner states a new price for a tree ("tree two is nine hundred"), use field: "spoken_price", value: 900. Copy spoken numbers verbatim; never invent prices.
7. For op: "add_tree", pass value as an object { species, height_ft, size_class, work, hazards, stump, haul, spoken_price, customer_description }.
8. For op: "remove_tree", set tree: <number>.
9. If part of the instruction is ambiguous, put a short note in unclear[] and make NO change for that ambiguous part.`;

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
  const priceBook = business?.price_book || null;
  const changedFields = [];
  const quotePatch = {};

  let workingItems = [...items];

  for (const change of parsed.changes) {
    if (change.op === "set" && !change.tree && change.field && ALLOWED_QUOTE_FIELDS.has(change.field)) {
      quotePatch[change.field] = change.value;
      changedFields.push(`quote:${change.field}`);
    } else if (change.op === "set" && Number(change.tree) > 0 && change.field && ALLOWED_TREE_FIELDS.has(change.field)) {
      const treeNum = Number(change.tree);
      const mainIdx = workingItems.findIndex((it) => it.tree_number === treeNum && !it.is_stump_line);
      if (mainIdx === -1) continue;

      const target = { ...workingItems[mainIdx] };
      const field = change.field;

      if (field === "spoken_price" || field === "price") {
        const num = change.value == null ? null : Number(change.value);
        target.spoken_price = num;
        target.price_source = num != null ? "spoken" : "none";
        const repriced = priceSingleItem(target, priceBook);
        workingItems[mainIdx] = repriced;
        await base44.entities.QuoteItem.update(repriced.id, {
          spoken_price: repriced.spoken_price,
          price: repriced.price,
          price_book_estimate: repriced.price_book_estimate,
          price_source: repriced.price_source,
          flagged: repriced.flagged,
        });
        changedFields.push(`tree:${treeNum}:price`);
      } else if (field === "stump" && change.value === "optional") {
        target.stump = "leave";
        const repricedMain = priceSingleItem(target, priceBook);
        workingItems[mainIdx] = repricedMain;
        await base44.entities.QuoteItem.update(repricedMain.id, {
          stump: "leave",
          price: repricedMain.price,
          price_book_estimate: repricedMain.price_book_estimate,
          price_source: repricedMain.price_source,
          flagged: repricedMain.flagged,
        });

        const existingStump = workingItems.find((it) => it.tree_number === treeNum && it.is_stump_line);
        if (!existingStump) {
          const stumpDraft = priceSingleItem(
            {
              quote_id: quote.id,
              tree_number: treeNum,
              label: `${repricedMain.label || `Tree ${treeNum}`} — Stump grinding`,
              species: repricedMain.species || "",
              height_ft: repricedMain.height_ft,
              size_class: inferSizeClass(repricedMain.height_ft, repricedMain.size_class),
              work: "stump_grind",
              hazards: [],
              stump: "grind",
              haul: false,
              optional: true,
              is_stump_line: true,
              spoken_price: null,
              customer_description: `Grind the ${repricedMain.species || `Tree ${treeNum}`} stump below grade and level grindings.`,
            },
            priceBook
          );
          const createdStump = await base44.entities.QuoteItem.create(stumpDraft);
          workingItems.push(createdStump);
        }
        changedFields.push(`tree:${treeNum}:stump`);
      } else if (field === "stump_spoken_price") {
        const stumpIdx = workingItems.findIndex((it) => it.tree_number === treeNum && it.is_stump_line);
        if (stumpIdx !== -1) {
          const nextStump = priceSingleItem(
            {
              ...workingItems[stumpIdx],
              spoken_price: Number(change.value),
              price_source: "spoken",
            },
            priceBook
          );
          workingItems[stumpIdx] = nextStump;
          await base44.entities.QuoteItem.update(nextStump.id, {
            spoken_price: nextStump.spoken_price,
            price: nextStump.price,
            price_source: nextStump.price_source,
            flagged: nextStump.flagged,
          });
          changedFields.push(`tree:${treeNum}:stump`);
        }
      } else {
        if (field === "stump" && change.value !== "optional") {
          const stumpItems = workingItems.filter((it) => it.tree_number === treeNum && it.is_stump_line);
          for (const st of stumpItems) {
            if (st.id) await base44.entities.QuoteItem.delete(st.id);
          }
          workingItems = workingItems.filter((it) => !(it.tree_number === treeNum && it.is_stump_line));
        }
        target[field] = change.value;
        const repriced = priceSingleItem(target, priceBook);
        workingItems[mainIdx] = repriced;
        await base44.entities.QuoteItem.update(repriced.id, {
          [field]: repriced[field],
          size_class: repriced.size_class,
          price: repriced.price,
          price_book_estimate: repriced.price_book_estimate,
          price_source: repriced.price_source,
          flagged: repriced.flagged,
        });
        changedFields.push(`tree:${treeNum}:${field}`);
      }
    } else if (change.op === "add_tree" && change.value && typeof change.value === "object") {
      const nextNum =
        workingItems.reduce((max, it) => Math.max(max, Number(it.tree_number) || 0), 0) + 1;
      const expanded = expandTreesToQuoteItems([{ ...change.value, tree_number: nextNum }], priceBook);
      for (const draft of expanded) {
        const created = await base44.entities.QuoteItem.create({ ...draft, quote_id: quote.id });
        workingItems.push(created);
      }
      changedFields.push(`tree:${nextNum}:added`);
    } else if (change.op === "remove_tree" && Number(change.tree) > 0) {
      const treeNum = Number(change.tree);
      const toRemove = workingItems.filter((it) => it.tree_number === treeNum);
      for (const rem of toRemove) {
        if (rem.id) await base44.entities.QuoteItem.delete(rem.id);
      }
      workingItems = workingItems.filter((it) => it.tree_number !== treeNum);
      changedFields.push(`tree:${treeNum}:removed`);
    }
  }

  if (parsed.unclear.length > 0) {
    quotePatch.unclear = [...(quote.unclear || []), ...parsed.unclear];
  }

  const totals = calculateQuoteTotals({
    items: workingItems,
    tickedOptionalIds: quote.selected_optional_ids || [],
    minCharge: business?.min_charge || 0,
    taxRate: business?.tax_rate || 0,
    depositPct: quotePatch.deposit_pct ?? quote.deposit_pct ?? 0,
  });

  const updatedQuote = await base44.entities.Quote.update(quote.id, {
    ...quotePatch,
    subtotal: totals.subtotal,
    tax_amount: totals.taxAmount,
    total: totals.total,
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

export async function notifyOwnerByEmail({ base44, toEmail, subject, heading, detailLines = [] }) {
  if (!toEmail) return;
  try {
    const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:540px;margin:0 auto;padding:24px;color:#1d1d1f;">
      <p style="font-size:12px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:#1b4332;margin:0 0 8px;">Notch Quote Update</p>
      <h2 style="font-size:22px;margin:0 0 14px;">${heading}</h2>
      ${detailLines.map((l) => `<p style="font-size:15px;line-height:1.5;margin:6px 0;color:#3f3f46;">${l}</p>`).join("")}
    </div>`;
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: toEmail,
      subject,
      html,
      category: "transactional",
    });
  } catch {
    // Email notification failure must never block homeowner view/accept
  }
}

export async function createFollowUpSmsText({ base44, userId, businessName, clientName, address, total, currency }) {
  enforceAiRateLimit(userId);
  const formattedTotal = formatMoney(total, currency);
  const prompt = `Write a brief, natural text message from ${businessName || "our tree crew"} following up with homeowner ${clientName || "there"} about the tree quote we sent for ${address || "your property"} (${formattedTotal}).
STRICT RULES:
- Under 220 characters total.
- Plain conversational English, warm and low-pressure.
- NO emojis, NO hashtags, NO exclamation spam, NO markdown quotes.`;

  const raw = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
  const cleaned = String(raw || "")
    .replace(/^["']|["']$/g, "")
    .replace(/[\p{Extended_Pictographic}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.slice(0, 238);
}