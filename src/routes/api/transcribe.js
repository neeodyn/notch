import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireUserRoute } from "@/lib/auth-middleware";
import { transcribeAudioOnServer } from "@/lib/quote-engine.server";

const BodySchema = z.object({
  quoteId: z.string().min(1).max(120),
  fileUri: z.string().max(500).optional().default(""),
  durationS: z.number().min(0).max(3600).optional().default(20),
  manualTranscript: z.string().max(10000).optional().default(""),
  kind: z.enum(["capture", "edit"]).optional().default("capture"),
});

export const Route = createFileRoute("/api/transcribe")({
  server: {
    middleware: [requireUserRoute],
    handlers: {
      POST: async ({ request, context }) => {
        const body = BodySchema.parse(await request.json());
        const base44 = context.getBase44();
        const quote = await base44.entities.Quote.get(body.quoteId);
        const res = await transcribeAudioOnServer({
          base44,
          userId: context.user.id,
          quoteId: quote.id,
          kind: body.kind,
          fileUri: body.fileUri,
          durationS: body.durationS,
          manualTranscript: body.manualTranscript,
        });
        return Response.json({
          recordingId: res.recording.id,
          transcript: res.transcript,
          segments: res.segments,
        });
      },
    },
  },
});