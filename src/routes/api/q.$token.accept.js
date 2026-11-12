import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { calculateQuoteTotals, formatMoney } from "@/lib/pricing";
import {
  getBusinessSettings,
  isQuoteResponseLocked,
  lockedQuoteResponse,
  notifyOwnerByEmail,
} from "@/lib/quote-engine.server";

const BodySchema = z.object({
  acceptedName: z.string().min(2).max(160),
  agreed: z.literal(true),
  selectedOptionalIds: z.array(z.string().max(120)).default([]),
});

export const Route = createFileRoute("/api/q/$token/accept")({
  server: {
    handlers: {
      POST: async ({ request, params, context }) => {
        const token = String(params.token || "").trim();
        if (token.length < 6) return Response.json({ error: "Invalid token" }, { status: 400 });

        const base44 = context.getBase44();
        const svc = base44.asServiceRole;

        const found = await svc.entities.Quote.filter({ public_token: token }, { limit: 1 });
        const quote = found.items?.[0];
        if (!quote) return Response.json({ error: "Not found" }, { status: 404 });
        if (isQuoteResponseLocked(quote)) return Response.json(lockedQuoteResponse(quote));

        const parsedBody = BodySchema.safeParse(await request.json().catch(() => null));
        if (!parsedBody.success) {
          return Response.json(
            { error: "Type your full name and tick the agreement to accept." },
            { status: 400 }
          );
        }
        const body = parsedBody.data;

        const business = quote.business_id
          ? await svc.entities.Business.get(quote.business_id).catch(() => null)
          : null;
        const bizSettings = getBusinessSettings(business);
        const itemsPage = await svc.entities.QuoteItem.filter(
          { quote_id: quote.id },
          { sort: "area_number", limit: 100 }
        );
        const items = itemsPage.items || [];
        const validOptionalIds = body.selectedOptionalIds.filter((id) =>
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

        const ip =
          request.headers.get("cf-connecting-ip") ||
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          "unknown";
        const ua = (request.headers.get("user-agent") || "unknown").slice(0, 300);
        const nowIso = new Date().toISOString();

        await svc.entities.Quote.update(quote.id, {
          status: "accepted",
          selected_optional_ids: validOptionalIds,
          subtotal_excl_gst: totals.subtotalExclGst,
          gst_amount: totals.gstAmount,
          total_incl_gst: totals.totalInclGst,
          subtotal: totals.subtotalExclGst,
          tax_amount: totals.gstAmount,
          total: totals.totalInclGst,
          deposit_amount: totals.depositAmount,
          accepted_at: nowIso,
          accepted_name: body.acceptedName.trim(),
          accepted_ip: ip,
          accepted_user_agent: ua,
        });

        await svc.entities.QuoteEvent.create({
          quote_id: quote.id,
          type: "accepted",
          meta: { accepted_name: body.acceptedName.trim(), total: totals.totalInclGst },
        });

        await notifyOwnerByEmail({
          base44,
          toEmail: business?.email,
          subject: `Quote accepted by ${body.acceptedName.trim()}`,
          heading: `${body.acceptedName.trim()} accepted your painting quote`,
          detailLines: [
            `Property: ${quote.address || ""}`,
            `Accepted total (incl. GST): ${formatMoney(totals.totalInclGst, bizSettings.currency)}`,
          ],
        });

        return Response.json({
          ok: true,
          status: "accepted",
          accepted_at: nowIso,
          accepted_name: body.acceptedName.trim(),
          total: totals.totalInclGst,
        });
      },
    },
  },
});