import { ShieldCheck, Check, ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

const safeguards = ["Your spoken price always comes first", "Outlier prices flagged against your rate card", "Recordings saved on your phone before upload", "Acceptance recorded with name, time and IP"];
export default function PremiumTrust() {
  return (
    <section className="trust-section glass-panel">
      <div><span className="trust-icon"><ShieldCheck size={28} strokeWidth={1.4} /></span><p className="eyebrow mt-7">CONFIDENCE, BUILT IN</p><h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Your reputation.<br />In safe hands.</h2><p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">Automation where it helps. Your judgement where it matters. Every quote is yours to review before it goes out.</p></div>
      <div className="flex flex-col justify-center"><div className="space-y-5">{safeguards.map((text) => <p key={text} className="flex items-center gap-3 text-sm"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Check size={13} /></span>{text}</p>)}</div><Link to="/app" className="premium-button mt-8 self-start">Start quoting with confidence <ArrowUpRight size={16} /></Link></div>
    </section>
  );
}