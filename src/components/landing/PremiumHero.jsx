import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Play, Check } from "lucide-react";
import HeroScene from "@/components/landing/HeroScene";

export default function PremiumHero() {
  return (
    <section className="premium-hero">
      <div className="hero-intro">
        <div className="hero-eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> BUILT FOR NEW ZEALAND PAINTERS</div>
        <h1 className="hero-heading">Your best work.<br /><span>A better way to quote.</span></h1>
        <p className="hero-description">Walk the house. Speak the details. Send something exceptional.<br className="hidden sm:block" /> From first measurement to signed quote, without the evening admin.</p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/app" className="premium-button">Start your free trial <ArrowUpRight size={17} /></Link>
          <a href="#walkthrough" className="premium-button-secondary"><Play size={14} /> See the 40-second walk</a>
        </div>
        <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground"><Check size={13} /> 7 days free from your first sent quote</p>
      </div>
      <HeroScene />
      <div className="hero-footnote"><span>Made for the job site. Ready for the homeowner.</span><span>Metres. NZ dollars. 15% GST.</span></div>
    </section>
  );
}