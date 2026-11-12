import { ChevronLeft, MapPin, Mic, RotateCcw, Send, User } from "lucide-react";
import PhoneStatusBar from "@/components/landing/screens/PhoneStatusBar";
import ReviewArea from "@/components/landing/screens/ReviewArea";
import { formatMoney } from "@/lib/pricing";
import { NZ_IMAGERY } from "@/lib/nzImagery";

/** The check screen. `edited` shows it straight after a spoken change. */
export default function ReviewScreen({ edited = false }) {
  const hallway = edited ? 450 : 400;

  return (
    <div className="phone-screen">
      <PhoneStatusBar />
      <div className="flex items-center gap-1 border-b border-border px-3 pb-2">
        <span className="flex items-center text-[12px] font-medium text-primary"><ChevronLeft size={14} />Quotes</span>
        <span className="flex-1 pl-1 text-[13px] font-semibold">Check quote</span>
        <RotateCcw size={13} />
      </div>
      {edited && (
        <p className="absolute inset-x-3 top-[46px] z-10 flex items-center justify-between gap-2 rounded-[14px] bg-foreground px-3 py-2 text-[10px] text-background">
          <span>Updated: “Hallway is four fifty.”</span>
          <span className="font-semibold">Undo</span>
        </p>
      )}

      <div className="flex-1 space-y-2 overflow-hidden px-3 pt-2.5">
        <div className="flex items-start justify-between gap-2 rounded-[16px] bg-card px-3 py-2.5">
          <div>
            <p className="flex items-center gap-1.5 text-[13px] font-semibold"><User size={11} className="text-muted-foreground" />Sarah Miller</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground"><MapPin size={11} />14 Kauri Street, Ponsonby</p>
          </div>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[9px] font-medium">30% deposit</span>
        </div>
        <ReviewArea number={1} name="Lounge" spec="5 × 4 m · stud 2.4 · walls 38.9 m², ceiling 20 m² · 2 coats" price="$1,100" photo={NZ_IMAGERY.lounge} />
        <ReviewArea number={2} name="Hallway" spec="8 × 1.2 m · stud 2.4 · walls 39.7 m² · 2 coats" price={`$${hallway}`} was={edited ? "$400" : null} changed={edited} />
        <ReviewArea number={2} name="Ceiling" chip="Optional" spec="Hallway · 9.6 m² · 2 coats" price="$190" />
      </div>

      <span className="absolute bottom-[75px] right-3 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
        <Mic size={18} />
      </span>
      <div className="flex items-center justify-between gap-2 border-t border-border bg-background px-3 pb-4 pt-2.5">
        <div className="tabular-money">
          <p className="text-[16px] font-bold leading-tight">{formatMoney((1100 + hallway) * 1.15, "NZD")}</p>
          <p className="text-[9px] text-muted-foreground">Incl. 15% GST</p>
        </div>
        <span className="flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-[12px] font-semibold text-primary-foreground"><Send size={13} />Send quote</span>
      </div>
    </div>
  );
}