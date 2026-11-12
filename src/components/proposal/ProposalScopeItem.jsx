import { Check, Plus } from "lucide-react";
import { formatMoney } from "@/lib/pricing";

export default function ProposalScopeItem({ item, meta, currency, optional = false, checked, disabled, onToggle }) {
  const Tag = optional ? "label" : "article";
  return (
    <Tag className={`proposal-scope-item print-card ${optional ? "proposal-option" : ""} ${checked ? "proposal-option-selected" : ""}`}>
      <div className="flex items-start gap-3.5 sm:gap-5">
        {optional ? <><input type="checkbox" checked={checked} disabled={disabled} onChange={onToggle} className="sr-only" /><span className="proposal-option-control" aria-hidden="true">{checked ? <Check size={16} /> : <Plus size={16} />}</span></> : <span className="proposal-area-index">{String(item.area_number).padStart(2, "0")}</span>}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3"><h3 className="text-lg font-semibold tracking-tight sm:text-xl">{item.name || `Area ${item.area_number}`}</h3><span className="tabular-money shrink-0 text-base font-semibold sm:text-lg">{item.price != null ? `${optional ? "+" : ""}${formatMoney(item.price, currency)}` : "TBC"}</span></div>
          <p className="tabular-money mt-2 text-[11px] leading-relaxed text-muted-foreground">{meta}</p>
          <p className="mt-3 text-sm leading-relaxed text-foreground/75">{item.customer_description}</p>
          {item.colour && <span className="proposal-colour"><span className="h-2 w-2 rounded-full border border-border bg-card" />{item.colour}</span>}
        </div>
      </div>
    </Tag>
  );
}