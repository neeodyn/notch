import { createFileRoute } from "@tanstack/react-router";
import ClosingCta from "@/components/landing/ClosingCta";
import FeatureGrid from "@/components/landing/FeatureGrid";
import LandingHeader from "@/components/landing/LandingHeader";
import PremiumFooter from "@/components/landing/PremiumFooter";
import PremiumHero from "@/components/landing/PremiumHero";
import PremiumTrust from "@/components/landing/PremiumTrust";
import PremiumWorkflow from "@/components/landing/PremiumWorkflow";
import PricingPlansSection from "@/components/landing/PricingPlansSection";
import { NZ_IMAGERY } from "@/lib/nzImagery";

const TITLE = "Notch — Your best work. A better way to quote.";
const DESCRIPTION = "Premium mobile quoting for New Zealand painters. Walk the house, speak the details, and send a beautifully clear, GST-ready proposal.";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: TITLE },
    { name: "description", content: DESCRIPTION },
    { property: "og:type", content: "website" },
    { property: "og:title", content: TITLE },
    { property: "og:description", content: DESCRIPTION },
    { property: "og:image", content: NZ_IMAGERY.ute },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="premium-site">
      <LandingHeader />
      <main>
        <PremiumHero />
        <PremiumWorkflow />
        <FeatureGrid />
        <PremiumTrust />
        <PricingPlansSection />
        <ClosingCta />
      </main>
      <PremiumFooter />
    </div>
  );
}