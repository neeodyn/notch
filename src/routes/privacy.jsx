import { createFileRoute } from "@tanstack/react-router";
import LegalDocument from "@/components/legal/LegalDocument";
import { PRIVACY_CONTENT } from "@/components/legal/privacyContent";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Notch" },
      { name: "description", content: "How Notch collects, uses and protects personal information under the New Zealand Privacy Act 2020." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return <LegalDocument {...PRIVACY_CONTENT} />;
}