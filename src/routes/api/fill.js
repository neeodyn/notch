import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireUserRoute } from "@/lib/auth-middleware";
import {
  calculateQuoteTotals,
  describeMissingMeasurements,
  expandAreasToQuoteItems,
  matchPhotosToItems,
  mergeUnclearNotes,
} from "@/lib/pricing";
import {
  extractQuoteStructureWithRetry,
  getBusinessSettings,
  saveVersionSnapshot,
} from "@/lib/quote-engine.server";

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
          { owner_id: context.user.id },
          { sort: "-created_date", limit: 1 }
        );
        const business = bizPage.items?.[0] || null;
        const bizSettings = getBusinessSettings(business);

        const extracted = await extractQuoteStructureWithRetry({
          base44,
          userId: context.user.id,
          segments: body.segments,
          photoTimes: body.photos.map((p) => p.taken_at_s),
          defaultStudM: bizSettings.default_stud_m,
        });

        await base44.entities.QuoteItem.deleteMany({ quote_id: quote.id });
        const itemDrafts = expandAreasToQuoteItems(
          extracted.areas || [],
          business?.price_book || null,
          bizSettings
        );
        const createdItems = [];
        for (const draft of itemDrafts) {
          createdItems.push(
            await base44.entities.QuoteItem.create({ ...draft, quote_id: quote.id })
          );
        }

        const matchedPhotos = matchPhotosToItems(
          body.photos,
          createdItems,
          body.segments
        );
        for (const p of matchedPhotos) {
          await base44.entities.Photo.create({
            quote_id: quote.id,
            item_id: p.item_id || "",
            area_number: p.area_number || 1,
            file_uri: p.file_uri,
            taken_at_s: p.taken_at_s,
            pin_x: null,
            pin_y: null,
          });
        }

        const depositPct = extracted.deposit_pct ?? quote.deposit_pct ?? 0;
        const totals = calculateQuoteTotals({
          items: createdItems,
          tickedOptionalIds: [],
          minCharge: bizSettings.min_charge,
          gstRate: bizSettings.gst_rate,
          pricesIncludeGst: bizSettings.prices_include_gst,
          depositPct,
        });

        const updatedQuote = await base44.entities.Quote.update(quote.id, {
          client_name: extracted.client?.name || quote.client_name || "",
          client_phone: extracted.client?.phone || quote.client_phone || "",
          client_email: extracted.client?.email || quote.client_email || "",
          address: extracted.client?.address || quote.address || "",
          deposit_pct: depositPct,
          notes: extracted.notes || quote.notes || "",
          unclear: mergeUnclearNotes(
            extracted.unclear || [],
            describeMissingMeasurements(createdItems, bizSettings)
          ),
          subtotal_excl_gst: totals.subtotalExclGst,
          gst_amount: totals.gstAmount,
          total_incl_gst: totals.totalInclGst,
          subtotal: totals.subtotalExclGst,
          tax_amount: totals.gstAmount,
          total: totals.totalInclGst,
          deposit_amount: totals.depositAmount,
        });

        await saveVersionSnapshot(base44, quote.id, "api_fill");
        return Response.json({ quote: updatedQuote, areas: createdItems });
      },
    },
  },
});