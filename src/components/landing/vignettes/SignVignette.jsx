import { Check, PaintRoller } from "lucide-react";

export default function SignVignette() {
  return (
    <div className="mx-auto max-w-[460px]">
      <div className="mb-3 flex items-center gap-3 rounded-[22px] bg-background px-4 py-3"><span className="brand-mark"><PaintRoller size={15} /></span><p className="flex-1 text-[14px] leading-tight"><span className="font-semibold">Sarah Miller opened your quote</span><span className="block text-[13px] text-muted-foreground">14 Kauri Street, Ponsonby</span></p><span className="text-[12px] text-muted-foreground">now</span></div>
      <div className="rounded-t-[28px] bg-background px-7 pb-10 pt-7">
        <p className="text-[13px] text-muted-foreground">Total incl. GST</p>
        <p className="tabular-money mt-1 font-display text-[52px] font-semibold leading-none tracking-[-0.05em]">$1,725.00</p>
        <div className="mt-7 flex items-center justify-between gap-3 border-t border-foreground/10 pt-5">
          <div><p className="text-[15px] font-semibold">Sarah Miller</p><p className="text-[13px] text-muted-foreground">Signed on her phone</p></div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground"><Check size={14} />Accepted</span>
        </div>
      </div>
    </div>
  );
}