import { createFileRoute } from "@tanstack/react-router";
import LandingHeader from "@/components/landing/LandingHeader";
import PremiumHero from "@/components/landing/PremiumHero";
import PremiumWorkflow from "@/components/landing/PremiumWorkflow";
import PremiumTrust from "@/components/landing/PremiumTrust";
import PremiumFooter from "@/components/landing/PremiumFooter";
import WalkthroughDemo from "@/components/landing/WalkthroughDemo";
import PricingPlansSection from "@/components/landing/PricingPlansSection";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Notch — Your best work. A better way to quote." },
    { name: "description", content: "Premium mobile quoting for New Zealand painters. Walk the house, speak the details, and send a beautifully clear, GST-ready proposal." },
  ] }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="premium-site">
      <LandingHeader />
      <main className="premium-container">
        <PremiumHero />
        <PremiumWorkflow />
        <section className="premium-section demo-section">
          <div className="section-heading"><div><p className="eyebrow">SEE THE DIFFERENCE</p><h2>Forty seconds.<br /><span className="text-muted-foreground">From your words to their quote.</span></h2></div><p className="section-description">An interactive house walk.<br />Explore each step at your own pace.</p></div>
          <WalkthroughDemo />
        </section>
        <PremiumTrust />
        <PricingPlansSection />
        <PremiumFooter />
      </main>
    </div>
  );
}