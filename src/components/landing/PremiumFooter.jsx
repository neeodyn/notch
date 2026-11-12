import { Link } from "@tanstack/react-router";
import { PaintRoller, ArrowUpRight } from "lucide-react";
import { SAMPLE_QUOTE_TOKEN } from "@/components/sample/sampleQuoteData";

export default function PremiumFooter() {
  return (
    <footer className="premium-footer">
      <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-center"><div><Link to="/" className="inline-flex items-center gap-2.5 text-xl font-semibold tracking-tight"><span className="brand-mark"><PaintRoller size={16} /></span>notch<span className="text-xs font-normal text-muted-foreground">/ NZ</span></Link><p className="mt-3 text-sm text-muted-foreground">A better finish starts with a better quote.</p></div><div className="flex flex-wrap items-center gap-7 text-sm font-medium"><Link to="/q/$token" params={{ token: SAMPLE_QUOTE_TOKEN }} className="text-muted-foreground hover:text-foreground">Sample quote</Link><a href="#pricing" className="text-muted-foreground hover:text-foreground">Pricing</a><Link to="/app" className="inline-flex items-center gap-1.5 text-primary">Get started <ArrowUpRight size={15} /></Link></div></div>
      <div className="mt-10 flex flex-wrap justify-between gap-3 border-t border-border/60 pt-5 text-[11px] text-muted-foreground"><span>Notch. Built for New Zealand painters & decorators.</span><span>On site. On your phone. On your terms.</span></div>
    </footer>
  );
}