import { createFileRoute } from "@tanstack/react-router";
import { notifyOwnerByEmail } from "@/lib/quote-engine.server";

export const Route = createFileRoute("/api/q/$token/view")({
  server: {
    handlers: {
      POST: async ({ params, context }) => {
        const token = String(params.token || "").trim();
        if (token.length < 6) return Response.json({ error: "Invalid token" }, { status: 400 });

        const base44 = context.getBase44();
        const svc = base44.asServiceRole;
        const found = await svc.entities.Quote.filter({ public_token: token }, { limit: 1 });
        const quote = found.items?.[0];
        if (!quote) return Response.json({ error: "Not found" }, { status: 404 });

        let viewerId = null;
        try {
          const me = await base44.auth.me();
          viewerId = me?.id || null;
        } catch {
          viewerId = null;
        }
        if (viewerId && viewerId === quote.created_by_id) {
          return Response.json({ viewed: false, owner: true });
        }

        if (!quote.viewed_at) {
          const nowIso = new Date().toISOString();
          const nextStatus =
            quote.status === "sent" || quote.status === "draft" ? "viewed" : quote.status;
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
            heading: `${quote.client_name || "Your client"} opened their painting quote`,
            detailLines: [`Property: ${quote.address || ""}`],
          });
          return Response.json({ viewed: true, firstView: true });
        }
        return Response.json({ viewed: true, firstView: false });
      },
    },
  },
});