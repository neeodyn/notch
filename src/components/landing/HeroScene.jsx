import { Mic, LockKeyhole, ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Image } from "@/components/ui/image";
import HeroQuotePreview from "@/components/landing/HeroQuotePreview";

export default function HeroScene() {
  return (
    <div className="hero-scene">
      <Image src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=2400&q=85" alt="Light-filled lounge with carefully finished walls and natural materials" className="hero-scene-image" />
      <div className="hero-scene-shade" />
      <div className="scene-caption"><span className="flex items-center gap-2 text-xs font-medium"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> ONE WALK. EVERY DETAIL.</span><h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Less admin.<br />More of your craft.</h2></div>
      <div className="voice-preview glass-panel">
        <div className="flex items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><Mic size={19} /></span><div><p className="text-xs font-semibold">Your words. A finished quote.</p><p className="mt-0.5 text-[11px] text-muted-foreground">A preview of your house walk</p></div><div className="ml-auto flex h-6 items-center gap-1" aria-hidden="true">{[8,16,24,13,20,9].map((height, i) => <span key={i} className="w-0.5 rounded-full bg-primary/60" style={{ height }} />)}</div></div>
        <p className="mt-4 text-sm leading-relaxed text-foreground/80">“Lounge, five by four. Walls and ceiling,<br className="hidden sm:block" /> two coats. Eleven hundred.”</p>
        <a href="#walkthrough" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-primary">See it come together <ArrowUpRight size={14} /></a>
      </div>
      <HeroQuotePreview />
      <div className="scene-security glass-panel"><LockKeyhole size={13} /><span>Private photos. Clear scope. Your prices.</span></div>
    </div>
  );
}