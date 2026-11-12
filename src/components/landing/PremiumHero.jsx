import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import HeroStage from "@/components/landing/HeroStage";
import StartLink from "@/components/landing/StartLink";
import { SAMPLE_QUOTE_TOKEN } from "@/components/sample/sampleQuoteData";

const FOOTNOTES = [
  "Made for the job site. Ready for the homeowner.",
  "Private photos. Clear scope. Your prices.",
  "Metres. NZ dollars. 15% GST.",
];

export default function PremiumHero() {
  return (
    <section className="premium-hero">
      <div className="premium-container hero-intro">
        <p className="hero-kicker">Built for New Zealand painters</p>
        <h1 className="hero-heading">Your best work.<br /><span>A better way to&nbsp;quote.</span></h1>
        <p className="hero-description">Walk the house and say what you see. Notch works out every room, matches your photos and keeps your prices exactly as you said&nbsp;them.</p>
        <div className="hero-actions">
          <StartLink className="premium-button">Start your free trial</StartLink>
          <Link to="/q/$token" params={{ token: SAMPLE_QUOTE_TOKEN }} className="premium-link">See a sample quote <ChevronRight size={18} /></Link>
        </div>
        <p className="hero-note">7 days free from your first sent quote.</p>
      </div>
      <div className="premium-container"><HeroStage /></div>
      <div className="premium-container hero-footnote">{FOOTNOTES.map((line) => <span key={line}>{line}</span>)}</div>
    </section>
  );
}