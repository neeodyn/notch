import { createFileRoute } from "@tanstack/react-router";
import { secrets } from "base44:runtime";
import { z } from "zod";

const PayloadSchema = z.object({
  business_id: z.string().min(1).max(120),
  event: z.enum(["subscription.activated", "checkout.completed"]).default("subscription.activated"),
});

export const Route = createFileRoute("/api/billing/webhook")({
  server: {
    handlers: {
      POST: async ({ request, context }) => {
        const configuredSecret = secrets.get("BILLING_WEBHOOK_SECRET");
        if (!configuredSecret) {
          return Response.json(
            { error: "Billing webhook secret is not configured yet." },
            { status: 503 }
          );
        }

        const signature = request.headers.get("x-webhook-secret") || "";
        if (signature !== configuredSecret) {
          return Response.json({ error: "Invalid webhook signature." }, { status: 401 });
        }

        const payload = PayloadSchema.parse(await request.json());
        const svc = context.getBase44().asServiceRole;
        await svc.entities.Business.update(payload.business_id, {
          plan: "active",
        });

        return Response.json({ ok: true, plan: "active" });
      },
    },
  },
});