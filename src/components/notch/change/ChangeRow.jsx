import { Check } from "lucide-react";
import { formatMoney } from "@/lib/pricing";
import { describeNewArea, formatEditValue } from "@/lib/quote-edits";

function titleFor(change) {
  if (change.op === "add_area") return `Add ${change.targetName}`;
  if (change.op === "remove_area") return `Remove ${change.targetName}`;
  return `${change.targetName} · ${change.label}`;
}

function summaryFor(change, currency) {
  if (change.op === "add_area") return describeNewArea(change.after, currency);
  if (change.op === "remove_area") {
    return change.before != null ? `Takes ${formatMoney(change.before, currency)} off the quote` : "Takes this area off the quote";
  }
  if (change.field === "optional_surfaces") return `${formatEditValue("surfaces", change.after)} becomes an optional extra`;
  return null;
}

export default function ChangeRow({ change, checked, onToggle, currency }) {
  const summary = summaryFor(change, currency);
  const tick = change.destructive ? "border-destructive bg-destructive text-destructive-foreground" : "border-primary bg-primary text-primary-foreground";
  return (
    <label className="flex cursor-pointer items-start gap-3.5 py-4">
      <input type="checkbox" checked={checked} onChange={onToggle} className="sr-only" />
      <span aria-hidden="true" className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${checked ? tick : "border-input"}`}>
        {checked && <Check className="h-4 w-4" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[16px] font-semibold ${change.destructive ? "text-destructive" : "text-foreground"}`}>{titleFor(change)}</span>
        {summary ? (
          <span className="mt-0.5 block text-[14px] leading-snug text-muted-foreground">{summary}</span>
        ) : (
          <span className="tabular-money mt-0.5 flex flex-wrap items-baseline gap-x-2 text-[14px]">
            <span className="text-muted-foreground">{formatEditValue(change.field, change.before, currency)}</span>
            <span aria-hidden="true" className="text-muted-foreground">→</span>
            <span className="sr-only">changes to</span>
            <span className="font-semibold text-foreground">{formatEditValue(change.field, change.after, currency)}</span>
          </span>
        )}
        {change.evidence && <span className="mt-1 block text-[13px] italic text-muted-foreground">Heard “{change.evidence}”</span>}
      </span>
    </label>
  );
}