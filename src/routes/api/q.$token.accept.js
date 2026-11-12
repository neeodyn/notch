import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { calculateQuoteTotals } from "@/lib/pricing";
import { notifyOwnerByEmail } from "@/lib/quote-engine.server";

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

        const body = BodySchema.parse(await request.json());
        const base44 = context.getBase44();
        const svc = base44.asServiceRole;

        const found = await svc.entities.Quote.filter({ public_token: token }, { limit: 1 });
        const quote = found.items?.[0];
        if (!quote) return Response.json({ error: "Not found" }, { status: 404 });

        const business = quote.business_id
          ? await svc.entities.Business.get(quote.business_id).catch(() => null)
          : null;
        const itemsPage = await svc.entities.QuoteItem.filter(
          { quote_id: quote.id },
          { sort: "tree_number", limit: 100 }
        );
        const items = itemsPage.items || [];
        const validOptionalIds = body.selectedOptionalIds.filter((id) =>
          items.some((it) => it.id === id && it.optional)
        );

        const totals = calculateQuoteTotals({
          items,
          tickedOptionalIds: validOptionalIds,
          minCharge: business?.min_charge || 0,
          taxRate: business?.tax_rate || 0,
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
          subtotal: totals.subtotal,
          tax_amount: totals.taxAmount,
          total: totals.total,
          deposit_amount: totals.depositAmount,
          accepted_at: nowIso,
          accepted_name: body.acceptedName.trim(),
          accepted_ip: ip,
          accepted_user_agent: ua,
        });

        await svc.entities.QuoteEvent.create({
          quote_id: quote.id,
          type: "accepted",
          meta: { accepted_name: body.acceptedName.trim(), total: totals.total },
        });

        await notifyOwnerByEmail({
          base44,
          toEmail: business?.email,
          subject: `Quote accepted by ${body.acceptedName.trim()}`,
          heading: `${body.acceptedName.trim()} accepted your tree quote`,
          detailLines: [
            `Property: ${quote.address || ""}`,
            `Accepted total: $${totals.total.toLocaleString("en-US")}`,
          ],
        });

        return Response.json({
          ok: true,
          status: "accepted",
          accepted_at: nowIso,
          total: totals.total,
        });
      },
    },
  },
});