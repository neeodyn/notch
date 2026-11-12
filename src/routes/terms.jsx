import { createFileRoute } from "@tanstack/react-router";
import LegalDocument from "@/components/legal/LegalDocument";
import { TERMS_CONTENT } from "@/components/legal/termsContent";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use — Notch" },
      { name: "description", content: "The terms for using Notch, quoting software for New Zealand painters and decorators." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return <LegalDocument {...TERMS_CONTENT} />;
}