import { useState } from "react";
import { Check, PaintRoller, Plus } from "lucide-react";
import { Image } from "@/components/ui/image";
import PhoneStatusBar from "@/components/landing/screens/PhoneStatusBar";
import { formatMoney } from "@/lib/pricing";
import { NZ_IMAGERY } from "@/lib/nzImagery";

const PHOTOS = [["01", "Lounge", NZ_IMAGERY.lounge], ["02", "Hallway", NZ_IMAGERY.hallway]];
const SCOPE = [["Lounge", "5 × 4 m · walls & ceiling · 2 coats", "$1,100"], ["Hallway", "8 × 1.2 m · walls · 2 coats", "$400"]];

/** What the homeowner opens. The optional extra really works: tap it. */
export default function ProposalScreen() {
  const [ceiling, setCeiling] = useState(false);
  const excl = ceiling ? 1690 : 1500;

  return (
    <div className="phone-screen">
      <PhoneStatusBar />
      <div className="flex-1 space-y-2.5 overflow-hidden px-3.5">
        <div className="flex items-center gap-2 border-b border-border pb-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-foreground text-background"><PaintRoller size={13} /></span>
          <p className="text-[12px] font-semibold leading-tight">Kauri Coast Painters<span className="block text-[9px] font-normal text-muted-foreground">Painting & decorating</span></p>
        </div>
        <p className="text-[9px] text-muted-foreground">Prepared for<span className="block text-[14px] font-semibold tracking-tight text-foreground">Sarah Miller</span>14 Kauri Street, Ponsonby</p>
        <div className="grid grid-cols-2 gap-2">
          {PHOTOS.map(([n, name, src]) => (
            <span key={n} className="relative h-[116px] overflow-hidden rounded-[12px]">
              <Image src={src} alt="" focalPointX={0.45} focalPointY={0.4} className="block h-full w-full object-cover" />
              <span className="absolute bottom-1 left-1 rounded-full bg-background/90 px-1.5 py-px text-[8px] font-medium">{n} {name}</span>
            </span>
          ))}
        </div>
        <div className="divide-y divide-border border-y border-border">
          {SCOPE.map(([name, meta, price]) => (
            <p key={name} className="flex justify-between gap-2 py-2 text-[12px] font-semibold">
              <span>{name}<span className="block text-[9px] font-normal text-muted-foreground">{meta}</span></span>
              <span className="tabular-money">{price}</span>
            </p>
          ))}
        </div>
        <label className={`flex cursor-pointer items-center gap-2 rounded-[14px] border-2 p-2 ${ceiling ? "border-primary" : "border-transparent bg-card"}`}>
          <input type="checkbox" className="sr-only" checked={ceiling} onChange={(e) => setCeiling(e.target.checked)} />
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${ceiling ? "bg-primary text-primary-foreground" : "bg-background text-primary"}`}>{ceiling ? <Check size={12} /> : <Plus size={12} />}</span>
          <span className="flex-1 text-[11px] font-semibold">Add hallway ceiling<span className="block text-[9px] font-normal text-muted-foreground">Optional · tap to try it</span></span>
          <span className="tabular-money text-[11px] font-semibold">+$190</span>
        </label>
        <p className="tabular-money flex justify-between text-[10px] text-muted-foreground"><span>Excl. GST {formatMoney(excl, "NZD")}</span><span>GST 15% {formatMoney(excl * 0.15, "NZD")}</span></p>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border bg-background px-3.5 pb-4 pt-2.5">
        <div className="tabular-money">
          <p className="text-[16px] font-bold leading-tight">{formatMoney(excl * 1.15, "NZD")}</p>
          <p className="text-[9px] text-muted-foreground">Incl. GST · deposit {formatMoney(excl * 1.15 * 0.3, "NZD")}</p>
        </div>
        <span className="flex h-9 items-center rounded-xl bg-primary px-3.5 text-[12px] font-semibold text-primary-foreground">Accept</span>
      </div>
    </div>
  );
}