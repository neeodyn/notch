import { Link } from "@tanstack/react-router";
import { PaintRoller } from "lucide-react";
import { SAMPLE_QUOTE_TOKEN } from "@/components/sample/sampleQuoteData";

export default function PremiumFooter() {
  return (
    <footer className="premium-footer premium-container">
      <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
        <div><Link to="/" className="inline-flex items-center gap-2.5 text-[19px] font-semibold tracking-[-0.03em]"><span className="brand-mark"><PaintRoller size={15} /></span>notch</Link><p className="mt-4 max-w-sm font-display text-[26px] font-semibold leading-[1.15] tracking-[-0.035em]">A better finish starts with a better quote.</p></div>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-[15px]"><Link to="/q/$token" params={{ token: SAMPLE_QUOTE_TOKEN }} className="text-muted-foreground hover:text-foreground">Sample quote</Link><a href="#pricing" className="text-muted-foreground hover:text-foreground">Pricing</a><Link to="/app" className="text-primary">Get started</Link></div>
      </div>
      <div className="mt-12 flex flex-wrap justify-between gap-2 border-t border-border pt-5 text-[12px] text-muted-foreground"><span>Notch. Built for New Zealand painters and decorators.</span><nav aria-label="Legal" className="flex gap-5"><Link to="/terms" className="hover:text-foreground">Terms of Use</Link><Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link></nav></div>
    </footer>
  );
}