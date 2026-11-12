import {
  ALL_SURFACES,
  KIND_LABELS,
  PREP_LABELS,
  SURFACE_LABELS,
  expandAreasToQuoteItems,
  fmtMetric,
  formatMoney,
  priceSingleItem,
} from "./pricing.js";
import { isNumberSpoken } from "./spoken-numbers.js";

/**
 * Spoken or typed quote edits run in two phases: buildEditProposal() turns the
 * AI's raw output into validated, reviewable changes (with before/after
 * values), and simulateEditChanges() applies a chosen subset in memory. The
 * browser uses the simulation to preview totals; the server uses it to write.
 */
export const QUOTE_EDIT_FIELDS = {
  client_name: { label: "Client name", type: "text", max: 160 },
  client_phone: { label: "Phone", type: "text", max: 60 },
  client_email: { label: "Email", type: "text", max: 160 },
  address: { label: "Address", type: "text", max: 300 },
  deposit_pct: { label: "Deposit", type: "number", min: 0, max: 100, unit: "%", mustBeSpoken: true },
  notes: { label: "Site notes", type: "text", max: 4000 },
};

export const AREA_EDIT_FIELDS = {
  name: { label: "Name", type: "text", max: 160 },
  kind: { label: "Type", type: "enum", values: ["interior", "exterior", "extra"] },
  length_m: { label: "Length", type: "number", min: 0, max: 500, unit: "m", nullable: true },
  width_m: { label: "Width", type: "number", min: 0, max: 500, unit: "m", nullable: true },
  stud_m: { label: "Stud", type: "number", min: 1, max: 12, unit: "m", nullable: true },
  area_m2_spoken: { label: "Wall area", type: "number", min: 0, max: 100000, unit: "m²", nullable: true },
  soffits_m2: { label: "Soffits", type: "number", min: 0, max: 100000, unit: "m²", nullable: true },
  fascia_m: { label: "Fascia", type: "number", min: 0, max: 100000, unit: "m", nullable: true },
  surfaces: { label: "Surfaces", type: "surfaces" },
  optional_surfaces: { label: "Make optional", type: "surfaces" },
  doors: { label: "Doors", type: "int", min: 0, max: 50 },
  windows: { label: "Windows", type: "int", min: 0, max: 50 },
  coats: { label: "Coats", type: "int", min: 1, max: 5 },
  prep: { label: "Prep", type: "enum", values: ["light", "standard", "heavy"] },
  prep_notes: { label: "Prep notes", type: "text", max: 500 },
  colour: { label: "Colour", type: "text", max: 120 },
  spoken_price: { label: "Price", type: "money", min: 0, max: 1000000, nullable: true, mustBeSpoken: true },
  optional: { label: "Optional", type: "boolean" },
  customer_description: { label: "Homeowner description", type: "text", max: 1000 },
};

const FIELD_ALIASES = { price: "spoken_price" };

export function staleQuoteError() {
  return Object.assign(new Error("This quote changed since you spoke. Say the change again."), {
    status: 409,
  });
}

export function pricingSettingsFor(business) {
  return {
    default_stud_m: Number(business?.default_stud_m) > 0 ? Number(business.default_stud_m) : 2.4,
    openings_pct:
      business?.openings_pct != null && Number.isFinite(Number(business.openings_pct))
        ? Number(business.openings_pct)
        : 10,
  };
}

export function coerceEditValue(spec, value) {
  if (value == null || value === "") {
    if (spec.nullable) return { ok: true, value: null };
    if (spec.type === "text") return { ok: true, value: "" };
    return { ok: false };
  }
  if (spec.type === "text") return { ok: true, value: String(value).trim().slice(0, spec.max) };
  if (spec.type === "number" || spec.type === "money" || spec.type === "int") {
    const num = Number(typeof value === "string" ? value.replace(/[^\d.-]/g, "") : value);
    if (!Number.isFinite(num) || num < spec.min || num > spec.max) return { ok: false };
    return { ok: true, value: spec.type === "int" ? Math.round(num) : Math.round(num * 100) / 100 };
  }
  if (spec.type === "enum") {
    const v = String(value).toLowerCase().trim();
    return spec.values.includes(v) ? { ok: true, value: v } : { ok: false };
  }
  if (spec.type === "boolean") {
    if (typeof value === "boolean") return { ok: true, value };
    if (["true", "yes"].includes(String(value).toLowerCase())) return { ok: true, value: true };
    if (["false", "no"].includes(String(value).toLowerCase())) return { ok: true, value: false };
    return { ok: false };
  }
  if (spec.type === "surfaces") {
    const list = (Array.isArray(value) ? value : [value])
      .map((s) => String(s).toLowerCase().trim())
      .filter((s) => ALL_SURFACES.includes(s));
    return list.length ? { ok: true, value: [...new Set(list)] } : { ok: false };
  }
  return { ok: false };
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/^(the|room|area) /, "");
}

function itemLabel(item) {
  return item.name || `Area ${item.area_number}`;
}

/** Finds the area a spoken reference means; never guesses between two matches. */
export function resolveAreaReference(items = [], ref) {
  if (ref == null || String(ref).trim() === "") return { status: "missing" };
  const asNum = Number(ref);
  if (Number.isFinite(asNum) && asNum > 0) {
    const inArea = items.filter((it) => Number(it.area_number) === asNum);
    const main = inArea.find((it) => !it.is_optional_split) || inArea[0];
    return main ? { status: "found", item: main } : { status: "not_found" };
  }
  const needle = normalizeName(ref);
  if (!needle) return { status: "not_found" };
  const pick = (list) => {
    if (list.length === 1) return { status: "found", item: list[0] };
    if (list.length > 1) return { status: "ambiguous", options: list.map(itemLabel) };
    return null;
  };
  return (
    pick(items.filter((it) => normalizeName(it.name) === needle)) ||
    pick(items.filter((it) => !it.is_optional_split && normalizeName(it.name).includes(needle))) ||
    pick(items.filter((it) => normalizeName(it.name).includes(needle))) || { status: "not_found" }
  );
}

export function readCurrentValue(item, field) {
  if (field === "spoken_price") return item.price ?? null;
  if (field === "optional_surfaces") return null;
  if (field === "surfaces") return item.surfaces || [];
  const spec = AREA_EDIT_FIELDS[field];
  return item[field] ?? (spec?.type === "text" ? "" : null);
}

function readQuoteValue(quote, field) {
  return quote[field] ?? (QUOTE_EDIT_FIELDS[field]?.type === "text" ? "" : null);
}

function valuesEqual(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function squash(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9$.%]+/g, " ").trim();
}

function evidenceFor(raw, transcript) {
  const evidence = String(raw?.evidence || "").trim();
  if (!evidence || !transcript) return null;
  return squash(transcript).includes(squash(evidence)) ? evidence.slice(0, 160) : null;
}

/** Validates the fields of a spoken new area; drops a price that wasn't said. */
export function sanitizeNewArea(value, transcript) {
  if (!value || typeof value !== "object") return { ok: false };
  const name = coerceEditValue(AREA_EDIT_FIELDS.name, value.name);
  if (!name.ok || !name.value) return { ok: false };
  const area = { name: name.value };
  for (const [key, spec] of Object.entries(AREA_EDIT_FIELDS)) {
    const raw = key === "spoken_price" ? value.spoken_price ?? value.price : value[key];
    if (key === "name" || raw == null) continue;
    const c = coerceEditValue(spec, raw);
    if (c.ok) area[key] = c.value;
  }
  let note = null;
  if (area.spoken_price != null && transcript != null && !isNumberSpoken(area.spoken_price, transcript)) {
    delete area.spoken_price;
    note = `${area.name}: didn't catch a clear price. Set it on the area.`;
  }
  return { ok: true, value: area, note };
}

function proposeQuoteField(raw, field, { quote, transcript }) {
  const spec = QUOTE_EDIT_FIELDS[field];
  const c = coerceEditValue(spec, raw.value);
  if (!c.ok) return { clarification: `Couldn't use that ${spec.label.toLowerCase()}. Try saying it again.` };
  if (spec.mustBeSpoken && c.value != null && !isNumberSpoken(c.value, transcript)) {
    return { clarification: `Didn't catch a clear ${spec.label.toLowerCase()}. Say the number again.` };
  }
  const before = readQuoteValue(quote, field);
  if (valuesEqual(before, c.value)) return {};
  return {
    key: `quote:${field}`,
    change: { op: "set_quote", field, label: spec.label, targetName: "Quote", before, after: c.value },
  };
}

function proposeAreaField(raw, field, { items, transcript }) {
  const spec = AREA_EDIT_FIELDS[field];
  const ref = resolveAreaReference(items, raw.area);
  if (ref.status === "ambiguous") return { clarification: `Which area did you mean: ${ref.options.join(" or ")}?` };
  if (ref.status !== "found") return { clarification: `Couldn't find an area called “${raw.area}”.` };
  const item = ref.item;
  const name = itemLabel(item);
  const c = coerceEditValue(spec, raw.value);
  if (!c.ok) return { clarification: `Couldn't use that ${spec.label.toLowerCase()} for ${name}.` };
  if (spec.mustBeSpoken && c.value != null && !isNumberSpoken(c.value, transcript)) {
    return { clarification: `Didn't catch a clear price for ${name}. Say the number again.` };
  }
  const before = readCurrentValue(item, field);
  if (field !== "optional_surfaces" && valuesEqual(before, c.value)) return {};
  return {
    key: `${item.id}:${field}`,
    change: {
      op: "set_area",
      itemId: item.id,
      areaNumber: item.area_number,
      targetName: name,
      field,
      label: spec.label,
      before,
      after: c.value,
    },
  };
}

function proposeRemoval(raw, { items }) {
  const ref = resolveAreaReference(items, raw.area);
  if (ref.status === "ambiguous") return { clarification: `Which area should go: ${ref.options.join(" or ")}?` };
  if (ref.status !== "found") return { clarification: `Couldn't find an area called “${raw.area}” to remove.` };
  const item = ref.item;
  return {
    key: `remove:${item.id}`,
    change: {
      op: "remove_area",
      itemId: item.id,
      areaNumber: item.area_number,
      targetName: itemLabel(item),
      label: "Remove",
      before: item.price ?? null,
      after: null,
      destructive: true,
    },
  };
}

function proposeRawChange(raw, ctx) {
  const field = FIELD_ALIASES[raw?.field] || raw?.field;
  const quoteLevel = raw?.area == null || raw?.area === "";
  if (raw?.op === "set" && quoteLevel && QUOTE_EDIT_FIELDS[field]) return proposeQuoteField(raw, field, ctx);
  if (raw?.op === "set" && !quoteLevel && AREA_EDIT_FIELDS[field]) return proposeAreaField(raw, field, ctx);
  if (raw?.op === "remove_area") return proposeRemoval(raw, ctx);
  if (raw?.op === "add_area") {
    const area = sanitizeNewArea(raw.value, ctx.transcript);
    if (!area.ok) return { clarification: "Didn't catch the new area's name. Say it again." };
    return {
      key: `add:${normalizeName(area.value.name)}`,
      clarification: area.note,
      change: { op: "add_area", targetName: area.value.name, label: "New area", before: null, after: area.value },
    };
  }
  return { clarification: "Skipped a change that can't be made by voice. Edit it on the area instead." };
}

/** Turns raw AI output into reviewable changes plus questions for the painter. */
export function buildEditProposal({ rawChanges = [], rawUnclear = [], quote, items = [], transcript = "" }) {
  const clarifications = rawUnclear.map((u) => String(u).trim()).filter(Boolean);
  const byKey = new Map();
  rawChanges.forEach((raw, idx) => {
    const result = proposeRawChange(raw, { quote, items, transcript });
    if (result.clarification) clarifications.push(result.clarification);
    if (result.change) {
      byKey.set(result.key, { ...result.change, id: `c${idx + 1}`, evidence: evidenceFor(raw, transcript) });
    }
  });
  return { changes: [...byKey.values()], clarifications: [...new Set(clarifications)] };
}

/** Server-side re-check of changes the painter confirmed in the browser. */
export function validateConfirmedChanges(changes = [], { quote, items = [] }) {
  return changes.map((change) => {
    const invalid = () => Object.assign(new Error("That change can't be applied."), { status: 400 });
    if (change.op === "set_quote") {
      const spec = QUOTE_EDIT_FIELDS[change.field];
      const c = spec ? coerceEditValue(spec, change.after) : { ok: false };
      if (!c.ok) throw invalid();
      if (!valuesEqual(readQuoteValue(quote, change.field), change.before)) throw staleQuoteError();
      return { op: "set_quote", field: change.field, after: c.value };
    }
    if (change.op === "add_area") {
      const area = sanitizeNewArea(change.after, null);
      if (!area.ok) throw invalid();
      return { op: "add_area", after: area.value };
    }
    const item = items.find((it) => it.id === change.itemId);
    if (!item) throw staleQuoteError();
    if (change.op === "remove_area") {
      return { op: "remove_area", itemId: item.id, scope: item.is_optional_split ? "item" : "area" };
    }
    if (change.op === "set_area") {
      const spec = AREA_EDIT_FIELDS[change.field];
      const c = spec ? coerceEditValue(spec, change.after) : { ok: false };
      if (!c.ok) throw invalid();
      if (change.field !== "optional_surfaces" && !valuesEqual(readCurrentValue(item, change.field), change.before)) {
        throw staleQuoteError();
      }
      return { op: "set_area", itemId: item.id, field: change.field, after: c.value };
    }
    throw invalid();
  });
}

function splitOptionalSurfaces(target, optSurfs, ctx) {
  const name = target.name || `Area ${target.area_number}`;
  const label = optSurfs.map((s) => SURFACE_LABELS[s] || s).join(" & ");
  return priceSingleItem(
    {
      quote_id: target.quote_id,
      area_number: target.area_number,
      name: `${name} — ${label}`,
      kind: target.kind,
      length_m: target.length_m,
      width_m: target.width_m,
      stud_m: target.stud_m,
      area_m2_spoken: null,
      soffits_m2: target.soffits_m2 ?? null,
      fascia_m: target.fascia_m ?? null,
      surfaces: optSurfs,
      doors: 0,
      windows: 0,
      coats: target.coats,
      prep: target.prep,
      colour: target.colour || "",
      spoken_price: null,
      optional: true,
      is_optional_split: true,
      customer_description: `Prepare and apply ${target.coats || 2} coats to ${name.toLowerCase()} ${optSurfs.join(" and ")}.`,
    },
    ctx.priceBook,
    ctx.settings
  );
}

/** Applies changes in memory and reprices only the areas they touch. */
export function simulateEditChanges({ items = [], changes = [], priceBook = null, settings = {} }) {
  const ctx = { priceBook, settings };
  let working = items.map((it) => ({ ...it }));
  const quotePatch = {};
  const updatedIds = new Set();
  const removedIds = new Set();
  const changedFields = [];
  let tempId = 0;
  const addTemp = (draft) => {
    tempId += 1;
    working.push({ ...draft, id: `new:${tempId}`, isNew: true });
  };

  for (const change of changes) {
    if (change.op === "set_quote") {
      quotePatch[change.field] = change.after;
      changedFields.push(`quote:${change.field}`);
      continue;
    }
    if (change.op === "add_area") {
      const areaNumber = working.reduce((max, it) => Math.max(max, Number(it.area_number) || 0), 0) + 1;
      expandAreasToQuoteItems([{ ...change.after, area_number: areaNumber }], priceBook, settings).forEach(addTemp);
      changedFields.push(`area:${areaNumber}:added`);
      continue;
    }
    const idx = working.findIndex((it) => it.id === change.itemId);
    if (idx === -1) throw staleQuoteError();
    const target = working[idx];
    if (change.op === "remove_area") {
      const scope = change.scope || (target.is_optional_split ? "item" : "area");
      const doomed = scope === "item" ? [target] : working.filter((it) => it.area_number === target.area_number);
      doomed.forEach((it) => !it.isNew && removedIds.add(it.id));
      working = working.filter((it) => !doomed.includes(it));
      changedFields.push(`area:${target.area_number}:removed`);
      continue;
    }
    const next = { ...target };
    if (change.field === "spoken_price") {
      next.spoken_price = change.after;
      next.price_source = change.after != null ? "spoken" : "none";
    } else if (change.field === "optional_surfaces") {
      next.surfaces = (next.surfaces || []).filter((s) => !change.after.includes(s));
      if (!working.some((it) => it.area_number === target.area_number && it.is_optional_split)) {
        addTemp(splitOptionalSurfaces(target, change.after, ctx));
      }
    } else {
      next[change.field] = change.after;
    }
    working[working.indexOf(target)] = priceSingleItem(next, priceBook, settings);
    if (!target.isNew) updatedIds.add(target.id);
    const key = change.field === "spoken_price" ? "price" : change.field === "optional_surfaces" ? "surfaces" : change.field;
    changedFields.push(`area:${target.area_number}:${key}`);
  }

  return { items: working, quotePatch, updatedIds, removedIds, changedFields };
}

export function formatEditValue(field, value, currency = "NZD") {
  if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) return "None";
  const spec = AREA_EDIT_FIELDS[field] || QUOTE_EDIT_FIELDS[field];
  if (!spec) return String(value);
  if (spec.type === "money") return formatMoney(value, currency);
  if (spec.type === "number") return spec.unit === "%" ? `${fmtMetric(value)}%` : `${fmtMetric(value)} ${spec.unit}`;
  if (field === "coats") return `${value} ${Number(value) === 1 ? "coat" : "coats"}`;
  if (spec.type === "surfaces") return value.map((s) => SURFACE_LABELS[s] || s).join(", ");
  if (spec.type === "boolean") return value ? "Yes" : "No";
  if (spec.type === "enum") return (field === "prep" ? PREP_LABELS[value] : KIND_LABELS[value]) || value;
  return String(value);
}

export function describeNewArea(area, currency = "NZD") {
  const parts = [];
  if (area.length_m && area.width_m) parts.push(`${fmtMetric(area.length_m)} × ${fmtMetric(area.width_m)} m`);
  else if (area.area_m2_spoken) parts.push(`${fmtMetric(area.area_m2_spoken)} m²`);
  if (area.surfaces?.length) parts.push(formatEditValue("surfaces", area.surfaces));
  if (area.coats) parts.push(formatEditValue("coats", area.coats));
  parts.push(area.spoken_price != null ? formatMoney(area.spoken_price, currency) : "price to set");
  return parts.join(" · ");
}