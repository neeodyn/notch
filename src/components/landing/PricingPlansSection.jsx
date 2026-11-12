import { useState } from "react";
import PremiumPlan from "@/components/landing/PremiumPlan";

export default function PricingPlansSection() {
  const [interval, setInterval] = useState("monthly");
  return (
    <section id="pricing" className="premium-section">
      <div className="section-heading"><div><p className="eyebrow">SIMPLE PLANS. SERIOUSLY GOOD QUOTES.</p><h2>A small investment.<br /><span className="text-muted-foreground">A more professional every day.</span></h2></div><p className="section-description">7 days free from your first sent quote.<br />Existing client quote links stay live.</p></div>
      <div className="mb-8 flex justify-center"><div className="billing-toggle glass-panel">{["monthly", "yearly"].map((period) => <button key={period} type="button" aria-pressed={interval === period} onClick={() => setInterval(period)} className={interval === period ? "billing-active" : ""}>{period === "monthly" ? "Monthly" : "Yearly · 2 months free"}</button>)}</div></div>
      <div className="grid gap-5 md:grid-cols-2">
        <PremiumPlan featured title="Founding Painter" description="For the first crews shaping a better way to quote. Your founding rate, locked in." price={interval === "yearly" ? 390 : 39} interval={interval} features={["Unlimited house walks, photos and voice edits", "Surface calculations and 15% GST breakdown", "Branded proposals with extras and e-signing"]} cta="Start your founding trial" />
        <PremiumPlan title="Standard" description="Your complete quoting companion. From the first room to a signed proposal." price={interval === "yearly" ? 490 : 49} interval={interval} features={["Custom surface, prep and coat rate card", "Homeowner view and acceptance alerts", "SMS follow-up drafts and print-ready proposals"]} cta="Start your free trial" />
      </div>
    </section>
  );
}