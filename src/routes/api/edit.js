import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireUserRoute } from "@/lib/auth-middleware";
import { applyVoiceEditWithRetry } from "@/lib/quote-engine.server";

const BodySchema = z.object({
  quoteId: z.string().min(1).max(120),
  transcript: z.string().min(1).max(2000),
});

export const Route = createFileRoute("/api/edit")({
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
        const itemsPage = await base44.entities.QuoteItem.filter(
          { quote_id: quote.id },
          { sort: "tree_number", limit: 100 }
        );

        const result = await applyVoiceEditWithRetry({
          base44,
          userId: context.user.id,
          quote,
          items: itemsPage.items || [],
          business: bizPage.items?.[0] || null,
          editTranscript: body.transcript,
        });

        return Response.json(result);
      },
    },
  },
});