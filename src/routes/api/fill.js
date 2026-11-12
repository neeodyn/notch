import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireUserRoute } from "@/lib/auth-middleware";
import { calculateQuoteTotals, expandTreesToQuoteItems, matchPhotosToItems } from "@/lib/pricing";
import { extractQuoteStructureWithRetry, saveVersionSnapshot } from "@/lib/quote-engine.server";

const BodySchema = z.object({
  quoteId: z.string().min(1).max(120),
  segments: z.array(
    z.object({
      id: z.number(),
      start: z.number(),
      end: z.number(),
      text: z.string(),
    })
  ),
  photos: z
    .array(
      z.object({
        file_uri: z.string().min(1).max(500),
        taken_at_s: z.number().min(0),
      })
    )
    .default([]),
});

export const Route = createFileRoute("/api/fill")({
  server: {
    middleware: [requireUserRoute],
    handlers: {
      POST: async ({ request, context }) => {
        const body = BodySchema.parse(await request.json());
        const base44 = context.getBase44();
        const quote = await base44.entities.Quote.get(body.quoteId);
        const bizPage = await base44.entities.Business.filter(
          { created_by_id: context.user.id },
          { sort: "-created_date", limit: 1 }
        );
        const business = bizPage.items?.[0] || null;

        const extracted = await extractQuoteStructureWithRetry({
          base44,
          userId: context.user.id,
          segments: body.segments,
          photoTimes: body.photos.map((p) => p.taken_at_s),
        });

        await base44.entities.QuoteItem.deleteMany({ quote_id: quote.id });
        const itemDrafts = expandTreesToQuoteItems(extracted.trees || [], business?.price_book || null);
        const createdItems = [];
        for (const draft of itemDrafts) {
          createdItems.push(await base44.entities.QuoteItem.create({ ...draft, quote_id: quote.id }));
        }

        const matchedPhotos = matchPhotosToItems(body.photos, createdItems, body.segments);
        for (const p of matchedPhotos) {
          await base44.entities.Photo.create({
            quote_id: quote.id,
            item_id: p.item_id || "",
            tree_number: p.tree_number || 1,
            file_uri: p.file_uri,
            taken_at_s: p.taken_at_s,
            pin_x: 0.5,
            pin_y: 0.38,
          });
        }

        const depositPct = extracted.deposit_pct ?? quote.deposit_pct ?? 0;
        const totals = calculateQuoteTotals({
          items: createdItems,
          tickedOptionalIds: [],
          minCharge: business?.min_charge || 0,
          taxRate: business?.tax_rate || 0,
          depositPct,
        });

        const updatedQuote = await base44.entities.Quote.update(quote.id, {
          client_name: extracted.client?.name || quote.client_name || "",
          client_phone: extracted.client?.phone || quote.client_phone || "",
          client_email: extracted.client?.email || quote.client_email || "",
          address: extracted.client?.address || quote.address || "",
          deposit_pct: depositPct,
          notes: extracted.notes || quote.notes || "",
          unclear: extracted.unclear || [],
          subtotal: totals.subtotal,
          tax_amount: totals.taxAmount,
          total: totals.total,
          deposit_amount: totals.depositAmount,
        });

        await saveVersionSnapshot(base44, quote.id, "api_fill");
        return Response.json({ quote: updatedQuote, items: createdItems });
      },
    },
  },
});