import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { calculateQuoteTotals, formatMoney } from "@/lib/pricing";
import {
  getBusinessSettings,
  isQuoteResponseLocked,
  lockedQuoteResponse,
  notifyOwnerByEmail,
  serializeQuoteTotals,
  signFileUriIfNeeded,
} from "@/lib/quote-engine.server";
import {
  SAMPLE_BUSINESS,
  SAMPLE_QUOTE,
  SAMPLE_QUOTE_TOKEN,
} from "@/components/sample/sampleQuoteData";

/** Server functions behind the homeowner's public quote link (/q/<token>). */

const PublicTokenSchema = z.object({ token: z.string().min(6).max(120) });

async function findQuoteByToken(svc, token) {
  const foundPage = await svc.entities.Quote.filter({ public_token: token }, { limit: 1 });
  return foundPage.items?.[0] || null;
}

async function currentViewerId(base44) {
  try {
    const me = await base44.auth.me();
    return me?.id || null;
  } catch {
    return null;
  }
}

const FALLBACK_BUSINESS = {
  name: "Painting & Decorating Proposal",
  phone: "",
  email: "",
  logo_url: null,
  currency: "NZD",
  gst_number: "",
  gst_rate: 0.15,
  prices_include_gst: false,
  default_stud_m: 2.4,
  openings_pct: 10,
  min_charge: 0,
  terms: "",
};

function publicBusiness(business, logoUrl) {
  if (!business) return FALLBACK_BUSINESS;
  return {
    name: business.name,
    phone: business.phone || "",
    email: business.email || "",
    logo_url: logoUrl,
    currency: business.currency || "NZD",
    gst_number: business.gst_number || "",
    gst_rate: business.gst_rate ?? 0.15,
    prices_include_gst: Boolean(business.prices_include_gst),
    default_stud_m: business.default_stud_m ?? 2.4,
    openings_pct: business.openings_pct ?? 10,
    min_charge: business.min_charge || 0,
    terms: business.terms || "",
  };
}

function publicQuote(quote) {
  return {
    id: quote.id,
    public_token: quote.public_token,
    client_name: quote.client_name || "",
    address: quote.address || "",
    status: quote.status,
    deposit_pct: quote.deposit_pct || 0,
    notes: quote.notes || "",
    selected_optional_ids: quote.selected_optional_ids || [],
    subtotal_excl_gst: quote.subtotal_excl_gst || quote.subtotal || 0,
    gst_amount: quote.gst_amount || quote.tax_amount || 0,
    total_incl_gst: quote.total_incl_gst || quote.total || 0,
    total: quote.total_incl_gst || quote.total || 0,
    accepted_at: quote.accepted_at || null,
    accepted_name: quote.accepted_name || null,
    sent_at: quote.sent_at || null,
    created_date: quote.created_date,
  };
}

function publicItem(it) {
  return {
    id: it.id,
    area_number: it.area_number,
    name: it.name,
    kind: it.kind || "interior",
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
    colour: it.colour || "",
    optional: Boolean(it.optional),
    is_optional_split: Boolean(it.is_optional_split),
    price: it.price,
    price_source: it.price_source,
    customer_description: it.customer_description,
  };
}

export const getPublicQuoteByTokenFn = createServerFn({ method: "GET" })
  .inputValidator((input) => PublicTokenSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (data.token === SAMPLE_QUOTE_TOKEN) {
      return {
        isSample: true,
        business: SAMPLE_BUSINESS,
        quote: SAMPLE_QUOTE,
        items: SAMPLE_QUOTE.items,
        photos: SAMPLE_QUOTE.photos,
        isOwnerViewing: false,
      };
    }

    const base44 = context.getBase44();
    const svc = base44.asServiceRole;
    const quote = await findQuoteByToken(svc, data.token);
    if (!quote) return null;

    const viewerId = await currentViewerId(base44);
    const business = quote.business_id
      ? await svc.entities.Business.get(quote.business_id).catch(() => null)
      : null;

    const [itemsPage, photosPage] = await Promise.all([
      svc.entities.QuoteItem.filter({ quote_id: quote.id }, { sort: "area_number", limit: 100 }),
      svc.entities.Photo.filter({ quote_id: quote.id }, { sort: "taken_at_s", limit: 100 }),
    ]);

    const logoUrl = business?.logo_uri ? await signFileUriIfNeeded(base44, business.logo_uri) : null;
    const signedPhotos = await Promise.all(
      (photosPage.items || []).map(async (p) => ({
        id: p.id,
        item_id: p.item_id,
        area_number: p.area_number,
        taken_at_s: p.taken_at_s,
        pin_x: p.pin_x ?? null,
        pin_y: p.pin_y ?? null,
        url: await signFileUriIfNeeded(base44, p.file_uri),
      }))
    );

    return {
      isSample: false,
      isOwnerViewing: Boolean(viewerId && viewerId === quote.created_by_id),
      business: publicBusiness(business, logoUrl),
      quote: publicQuote(quote),
      items: (itemsPage.items || []).map(publicItem),
      photos: signedPhotos,
    };
  });

export const recordPublicQuoteViewFn = createServerFn({ method: "POST" })
  .inputValidator((input) => PublicTokenSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (data.token === SAMPLE_QUOTE_TOKEN) return { recorded: false };

    const base44 = context.getBase44();
    const svc = base44.asServiceRole;
    const quote = await findQuoteByToken(svc, data.token);
    if (!quote) return { recorded: false };

    const viewerId = await currentViewerId(base44);
    if (viewerId && viewerId === quote.created_by_id) {
      return { recorded: false, reason: "owner" };
    }
    if (quote.viewed_at) return { recorded: false };

    const nowIso = new Date().toISOString();
    const nextStatus = quote.status === "sent" || quote.status === "draft" ? "viewed" : quote.status;
    await svc.entities.Quote.update(quote.id, { viewed_at: nowIso, status: nextStatus });
    await svc.entities.QuoteEvent.create({
      quote_id: quote.id,
      type: "viewed",
      meta: { viewed_at: nowIso },
    });

    const business = quote.business_id
      ? await svc.entities.Business.get(quote.business_id).catch(() => null)
      : null;
    await notifyOwnerByEmail({
      base44,
      toEmail: business?.email,
      subject: `${quote.client_name || "Homeowner"} opened your painting quote`,
      heading: `${quote.client_name || "Your client"} just viewed their quote`,
      detailLines: [
        `Property: ${quote.address || "Address not listed"}`,
        `Quote total (incl. GST): ${formatMoney(quote.total_incl_gst || quote.total || 0, business?.currency || "NZD")}`,
      ],
    });
    return { recorded: true };
  });

const PublicAcceptSchema = z.object({
  token: z.string().min(6).max(120),
  action: z.enum(["accept", "decline"]).default("accept"),
  acceptedName: z.string().max(160).optional().default(""),
  agreed: z.boolean().optional().default(false),
  selectedOptionalIds: z.array(z.string().max(120)).default([]),
});

export const respondToPublicQuoteFn = createServerFn({ method: "POST" })
  .inputValidator((input) => PublicAcceptSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (data.token === SAMPLE_QUOTE_TOKEN) {
      return {
        ok: true,
        isSample: true,
        status: data.action === "decline" ? "declined" : "accepted",
        accepted_at: new Date().toISOString(),
        accepted_name: data.acceptedName || "Sarah Miller",
      };
    }

    const base44 = context.getBase44();
    const svc = base44.asServiceRole;
    const req = getRequest();
    const ip =
      req?.headers?.get("cf-connecting-ip") ||
      req?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const userAgent = req?.headers?.get("user-agent") || "unknown";

    const quote = await findQuoteByToken(svc, data.token);
    if (!quote) throw new Error("Quote not found.");
    if (isQuoteResponseLocked(quote)) return lockedQuoteResponse(quote);

    const business = quote.business_id
      ? await svc.entities.Business.get(quote.business_id).catch(() => null)
      : null;
    const bizSettings = getBusinessSettings(business);

    if (data.action === "decline") {
      const nowIso = new Date().toISOString();
      await svc.entities.Quote.update(quote.id, { status: "declined", declined_at: nowIso });
      await svc.entities.QuoteEvent.create({
        quote_id: quote.id,
        type: "declined",
        meta: { declined_at: nowIso },
      });
      return { ok: true, status: "declined" };
    }

    const cleanName = String(data.acceptedName || "").trim();
    if (cleanName.length < 2 || !data.agreed) {
      throw new Error("Please type your full name and tick the agreement box to accept.");
    }

    const itemsPage = await svc.entities.QuoteItem.filter(
      { quote_id: quote.id },
      { sort: "area_number", limit: 100 }
    );
    const items = itemsPage.items || [];
    const validOptionalIds = data.selectedOptionalIds.filter((id) =>
      items.some((it) => it.id === id && it.optional)
    );

    const totals = calculateQuoteTotals({
      items,
      tickedOptionalIds: validOptionalIds,
      minCharge: bizSettings.min_charge,
      gstRate: bizSettings.gst_rate,
      pricesIncludeGst: bizSettings.prices_include_gst,
      depositPct: quote.deposit_pct || 0,
    });

    const nowIso = new Date().toISOString();
    await svc.entities.Quote.update(quote.id, {
      status: "accepted",
      selected_optional_ids: validOptionalIds,
      ...serializeQuoteTotals(totals),
      accepted_at: nowIso,
      accepted_name: cleanName,
      accepted_ip: ip,
      accepted_user_agent: userAgent.slice(0, 300),
    });

    await svc.entities.QuoteEvent.create({
      quote_id: quote.id,
      type: "accepted",
      meta: { accepted_name: cleanName, total_incl_gst: totals.totalInclGst, accepted_at: nowIso },
    });

    await notifyOwnerByEmail({
      base44,
      toEmail: business?.email,
      subject: `Quote accepted by ${cleanName} (${formatMoney(totals.totalInclGst, bizSettings.currency)})`,
      heading: `${cleanName} accepted your painting quote`,
      detailLines: [
        `Property: ${quote.address || "Address on file"}`,
        `Signed total (incl. GST): ${formatMoney(totals.totalInclGst, bizSettings.currency)}`,
        `Signed by: ${cleanName}`,
      ],
    });

    return {
      ok: true,
      status: "accepted",
      accepted_at: nowIso,
      accepted_name: cleanName,
      total: totals.totalInclGst,
    };
  });