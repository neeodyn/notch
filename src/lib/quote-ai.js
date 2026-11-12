import { formatMoney } from "./pricing.js";
import { isNumberSpoken } from "./spoken-numbers.js";

/** Bump when the capture prompt or its post-processing rules change. */
export const CAPTURE_EXTRACTION_VERSION = "capture-v2";

function areaLabel(area, index) {
  return area.name?.trim() || `Area ${index + 1}`;
}

function inheritFromNamedArea(next, resolvedAreas) {
  const targetName = next.same_as_area.trim().toLowerCase().replace(/^the\s+/, "");
  const ref =
    resolvedAreas.find((a) => (a.name || "").toLowerCase().includes(targetName)) ||
    resolvedAreas[resolvedAreas.length - 1];
  if (!ref) return;
  if (!next.surfaces || next.surfaces.length === 0) next.surfaces = ref.surfaces;
  if (!next.coats) next.coats = ref.coats;
  if (!next.prep) next.prep = ref.prep;
  if (!next.colour && ref.colour) next.colour = ref.colour;
}

function guardSpokenPrices(next, label, transcript, unclear) {
  for (const key of ["spoken_price", "optional_spoken_price"]) {
    const value = next[key];
    if (value == null) continue;
    const num = Number(value);
    if (Number.isFinite(num) && num >= 0 && isNumberSpoken(num, transcript)) continue;
    next[key] = null;
    const which = key === "optional_spoken_price" ? "optional price" : "price";
    unclear.add(
      `${label}: ${which} ${formatMoney(num)} wasn't clearly said in the recording. Set the price.`
    );
  }
}

function guardMeasurements(next, label, unclear) {
  const wall = Number(next.area_m2_spoken);
  if (!(wall > 0)) return;
  if (Number(next.soffits_m2) === wall) {
    next.soffits_m2 = null;
    unclear.add(`${label}: soffit m² matched the weatherboard area. Measure soffits separately.`);
  }
  if (Number(next.fascia_m) === wall) {
    next.fascia_m = null;
    unclear.add(`${label}: fascia matched the wall m². Fascia is measured in linear metres.`);
  }
}

function noteMissingStud(next, label, defaultStudM, unclear) {
  const kind = next.kind || "interior";
  const surfaces = Array.isArray(next.surfaces) ? next.surfaces : ["walls"];
  if (kind !== "interior" || !surfaces.includes("walls") || next.stud_m != null) return;
  const alreadyNoted = [...unclear].some(
    (u) => u.toLowerCase().includes(label.toLowerCase()) && u.toLowerCase().includes("stud")
  );
  if (!alreadyNoted) {
    unclear.add(`${label}: stud height not stated (wall m² shown using ${defaultStudM} m default stud)`);
  }
}

/**
 * Deterministic checks applied to every AI extraction of a house walk:
 * "same as" inheritance, prices and deposit that were never spoken are
 * removed (never invented), copied exterior measurements are cleared, and
 * each correction is listed in unclear[] for the painter to check.
 */
export function postProcessExtraction(parsed, { transcript = "", defaultStudM = 2.4 } = {}) {
  const unclear = new Set(parsed.unclear || []);
  const areas = [];

  (parsed.areas || []).forEach((area, index) => {
    const next = { ...area };
    const label = areaLabel(next, index);
    if (next.same_as_area) inheritFromNamedArea(next, areas);
    guardSpokenPrices(next, label, transcript, unclear);
    guardMeasurements(next, label, unclear);
    noteMissingStud(next, label, defaultStudM, unclear);
    areas.push(next);
  });

  let depositPct = parsed.deposit_pct ?? null;
  if (depositPct != null) {
    const num = Number(depositPct);
    if (!(num >= 0 && num <= 100) || !isNumberSpoken(num, transcript)) {
      depositPct = null;
      unclear.add("Deposit: percentage wasn't clearly said. Set it on the client card.");
    }
  }

  return { ...parsed, deposit_pct: depositPct, areas, unclear: [...unclear] };
}