import { useState } from "react";
import { Check, Plus, PaintRoller } from "lucide-react";
import { formatMoney } from "@/lib/pricing";

export default function HeroQuotePreview() {
  const [included, setIncluded] = useState(false);
  const subtotal = included ? 1690 : 1500;
  return (
    <div className="hero-proposal glass-panel">
      <div className="flex items-center justify-between border-b border-border/60 pb-5">
        <div className="flex items-center gap-2.5"><span className="brand-mark"><PaintRoller size={16} /></span><span className="text-sm font-semibold">Kauri Coast Painters</span></div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Sample quote</span>
      </div>
      <div className="py-5"><p className="eyebrow">Prepared for Sarah Miller</p><h3 className="mt-2 text-2xl font-semibold tracking-tight">A fresh start,<br />beautifully finished.</h3><p className="mt-2 text-xs text-muted-foreground">14 Kauri Street, Ponsonby</p></div>
      <div className="space-y-4 text-sm">
        <div className="flex justify-between"><div><p className="font-medium">Lounge</p><p className="mt-1 text-xs text-muted-foreground">5 × 4 m · walls & ceiling · 2 coats</p></div><span className="font-semibold">$1,100</span></div>
        <div className="flex justify-between"><div><p className="font-medium">Hallway</p><p className="mt-1 text-xs text-muted-foreground">8 × 1.2 m · walls · 2 coats</p></div><span className="font-semibold">$400</span></div>
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-3">
          <input type="checkbox" className="sr-only" checked={included} onChange={(e) => setIncluded(e.target.checked)} />
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${included ? "bg-primary text-primary-foreground" : "bg-card text-primary"}`}>{included ? <Check size={14} /> : <Plus size={14} />}</span>
          <span className="flex-1 text-xs font-medium">Add hallway ceiling<span className="block pt-0.5 text-[10px] text-muted-foreground">Try this optional extra</span></span><span className="text-xs font-semibold">+$190</span>
        </label>
      </div>
      <div className="mt-5 space-y-1.5 border-t border-border/60 pt-4 text-xs text-muted-foreground">
        <div className="flex justify-between"><span>Excl. GST</span><span>{formatMoney(subtotal, "NZD")}</span></div>
        <div className="flex justify-between"><span>GST 15%</span><span>{formatMoney(subtotal * 0.15, "NZD")}</span></div>
        <div className="flex items-baseline justify-between pt-2 text-foreground"><span className="font-medium">Total incl. GST</span><span className="tabular-money text-2xl font-semibold tracking-tight">{formatMoney(subtotal * 1.15, "NZD")}</span></div>
      </div>
    </div>
  );
}