import { ChevronRight } from "lucide-react";
import ScrollRevealText from "@/components/landing/ScrollRevealText";
import StartLink from "@/components/landing/StartLink";
import CheckStep from "@/components/landing/steps/CheckStep";
import SendStep from "@/components/landing/steps/SendStep";
import WalkStep from "@/components/landing/steps/WalkStep";

export default function PremiumWorkflow() {
  return (
    <section id="how-it-works" className="premium-section premium-container">
      <h2 className="eyebrow-heading">How it works</h2>
      <ScrollRevealText className="statement" text="One seamless flow. Walk the house once and every room is measured, every photo matched, every price kept exactly as you said it. By the time you’re back at the ute, the quote is ready to send." />
      <div className="steps">
        <WalkStep />
        <CheckStep />
        <SendStep />
      </div>
      <StartLink className="premium-link mt-8" trailing={<ChevronRight size={18} />}>Make your next quote a better one</StartLink>
    </section>
  );
}