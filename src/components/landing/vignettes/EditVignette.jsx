import { Mic } from "lucide-react";

export default function EditVignette() {
  return (
    <div className="pb-10">
      <div className="ink-chip inline-flex items-center gap-3 rounded-full py-2 pl-2 pr-5 text-[15px] font-medium"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"><Mic size={16} /></span>“Hallway is four fifty.”</div>
      <div className="ink-rule mt-8 flex items-end justify-between border-t pt-6">
        <div><p className="text-[19px] font-semibold tracking-[-0.02em]">Hallway</p><p className="ink-muted text-[13px]">8 × 1.2 m · walls · 2 coats</p></div>
        <p className="tabular-money text-right"><span className="ink-muted block text-[15px] line-through">$400</span><span className="font-display text-[52px] font-semibold leading-none tracking-[-0.05em]">$450</span></p>
      </div>
      <p className="ink-muted mt-6 text-[13px]">Updated just now. Undo in a tap.</p>
    </div>
  );
}