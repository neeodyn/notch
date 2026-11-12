import StartLink from "@/components/landing/StartLink";
import { ChevronRight } from "lucide-react";
import HeroScene from "@/components/landing/HeroScene";

export default function PremiumHero() {
  return (
    <section className="premium-hero">
      <div className="premium-container hero-intro">
        <p className="hero-kicker">Built for New Zealand painters</p>
        <h1 className="hero-heading">Your best work.<br /><span>A better way to&nbsp;quote.</span></h1>
        <p className="hero-description">Walk the house. Speak the details. Send something exceptional. From first measurement to signed quote, without the evening admin.</p>
        <div className="hero-actions">
          <StartLink className="premium-button">Start your free trial</StartLink>
          <a href="#walkthrough" className="premium-link">Watch the 40-second walk <ChevronRight size={18} /></a>
        </div>
        <p className="hero-note">7 days free from your first sent quote.</p>
      </div>
      <HeroScene />
      <div className="premium-container hero-footnote"><span>Made for the job site. Ready for the homeowner.</span><span>Private photos. Clear scope. Your prices.</span><span>Metres. NZ dollars. 15% GST.</span></div>
    </section>
  );
}