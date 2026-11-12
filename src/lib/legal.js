export const LEGAL_UPDATED = "12 November 2026";
export const QUOTE_VALIDITY_DAYS = 30;
/** Building Act 2004: residential building work at or above this (incl. GST) needs a written contract. */
export const RESIDENTIAL_CONTRACT_THRESHOLD = 30000;

/** The business behind Notch. Fill in before relying on the Terms and Privacy Policy. */
export const LEGAL_CONTACT = { entity: "Notch", email: "" };

export const CONSUMER_RIGHTS_NOTICE =
  "Nothing in this quote limits your rights under the Consumer Guarantees Act 1993 or the Fair Trading Act 1986.";

export const DEFAULT_PAINTING_TERMS = [
  "1. Validity. This quote is valid for 30 days from the date it was issued.",
  "2. Scope and price. The price covers the work described for each area. Measurements are taken on site and are approximate; the price is for the scope described, not a rate per square metre.",
  "3. Variations. Any change to the scope, or extra work needed because of conditions that could not reasonably be seen when quoting (such as rot, moisture damage, failing old coatings or lead-based paint), will be agreed with you in writing, including the cost, before it is done.",
  "4. Preparation and products. Surfaces are prepared to the level described for each area, in line with AS/NZS 2311 and the paint manufacturer's specifications.",
  "5. Colours. Final colours are confirmed with you in writing before work starts. Colour changes after work starts may be charged as a variation.",
  "6. Access and weather. You agree to provide safe, clear access during agreed working hours. Exterior work depends on suitable weather, and dates may move if conditions are unsuitable.",
  "7. Lead-based paint. Homes built before 1980 may have lead-based paint. If it is found, it will be managed in line with Ministry of Health and WorkSafe guidance, and any extra cost agreed with you first.",
  "8. Payment. Any deposit shown is payable on booking. The balance is payable within 7 days of the completion invoice, unless agreed otherwise in writing.",
].join("\n\n");

const DAY_MS = 24 * 60 * 60 * 1000;

/** Base44 timestamps are UTC but may omit the zone; read them as UTC everywhere. */
export function parseUtc(iso) {
  if (!iso) return NaN;
  const value = String(iso);
  return Date.parse(/[zZ]$|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`);
}

export function getQuoteDates(quote) {
  const issuedMs = parseUtc(quote?.sent_at || quote?.created_date);
  if (!Number.isFinite(issuedMs)) return { issuedAt: null, validUntil: null };
  return {
    issuedAt: new Date(issuedMs).toISOString(),
    validUntil: new Date(issuedMs + QUOTE_VALIDITY_DAYS * DAY_MS).toISOString(),
  };
}

export function quoteReference(quote) {
  if (quote?.reference) return quote.reference;
  const tail = String(quote?.id || "").replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase();
  return tail ? `Q-${tail}` : "—";
}

const NZ_DATE = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Pacific/Auckland",
});
const NZ_TIME = new Intl.DateTimeFormat("en-NZ", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Pacific/Auckland",
});

const NZ_SHORT_DATE = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  month: "short",
  timeZone: "Pacific/Auckland",
});

export function formatNzShortDate(iso) {
  const ms = parseUtc(iso);
  return Number.isFinite(ms) ? NZ_SHORT_DATE.format(ms) : "";
}

export function formatNzDate(iso) {
  const ms = parseUtc(iso);
  return Number.isFinite(ms) ? NZ_DATE.format(ms) : "—";
}

export function formatNzDateTime(iso) {
  const ms = parseUtc(iso);
  return Number.isFinite(ms) ? `${NZ_DATE.format(ms)} at ${NZ_TIME.format(ms)} NZ time` : "—";
}