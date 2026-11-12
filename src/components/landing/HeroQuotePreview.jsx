import { useState } from "react";
import { Check, Plus, PaintRoller } from "lucide-react";
import { formatMoney } from "@/lib/pricing";

export default function HeroQuotePreview() {
  const [included, setIncluded] = useState(false);
  const subtotal = included ? 1690 : 1500;
  return (
    <div className="hero-proposal glass-panel">
      <div className="flex items-center gap-2.5"><span className="brand-mark"><PaintRoller size={15} /></span><span className="text-[15px] font-semibold">Kauri Coast Painters</span></div>
      <div className="pb-5 pt-6"><p className="text-[13px] text-muted-foreground">Prepared for Sarah Miller</p><h3 className="mt-1.5 font-display text-[26px] font-semibold leading-[1.1] tracking-[-0.035em]">A fresh start,<br />beautifully finished.</h3></div>
      <div className="space-y-4 border-t border-foreground/10 pt-5 text-[15px]">
        <div className="flex justify-between"><div><p className="font-medium">Lounge</p><p className="text-[13px] text-muted-foreground">5 × 4 m · walls & ceiling · 2 coats</p></div><span className="tabular-money font-medium">$1,100</span></div>
        <div className="flex justify-between"><div><p className="font-medium">Hallway</p><p className="text-[13px] text-muted-foreground">8 × 1.2 m · walls · 2 coats</p></div><span className="tabular-money font-medium">$400</span></div>
        <label className="flex cursor-pointer items-center gap-3 rounded-[18px] bg-foreground/5 p-3">
          <input type="checkbox" className="sr-only" checked={included} onChange={(e) => setIncluded(e.target.checked)} />
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${included ? "bg-primary text-primary-foreground" : "bg-background text-primary"}`}>{included ? <Check size={14} /> : <Plus size={14} />}</span>
          <span className="flex-1 text-[14px] font-medium">Add hallway ceiling<span className="block text-[12px] font-normal text-muted-foreground">Tap to try it</span></span><span className="tabular-money text-[14px] font-medium">+$190</span>
        </label>
      </div>
      <div className="tabular-money mt-5 space-y-1 border-t border-foreground/10 pt-4 text-[13px] text-muted-foreground">
        <div className="flex justify-between"><span>Excl. GST</span><span>{formatMoney(subtotal, "NZD")}</span></div>
        <div className="flex justify-between"><span>GST 15%</span><span>{formatMoney(subtotal * 0.15, "NZD")}</span></div>
        <div className="flex items-baseline justify-between pt-2 text-foreground"><span className="text-[15px] font-medium">Total incl. GST</span><span className="font-display text-[30px] font-semibold tracking-[-0.04em]">{formatMoney(subtotal * 1.15, "NZD")}</span></div>
      </div>
    </div>
  );
}