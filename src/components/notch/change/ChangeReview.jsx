import { formatMoney } from "@/lib/pricing";
import ChangeRow from "@/components/notch/change/ChangeRow";

export default function ChangeReview({ proposal, selected, onToggle, preview, currency, error }) {
  const { transcript, changes, clarifications } = proposal;
  return (
    <div className="space-y-5">
      <p className="rounded-2xl bg-card px-4 py-3 text-[15px] leading-snug text-muted-foreground">“{transcript}”</p>

      {error && (
        <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-[14px] leading-snug text-destructive">{error}</p>
      )}

      {changes.length > 0 ? (
        <div className="divide-y divide-border border-y border-border">
          {changes.map((change) => (
            <ChangeRow key={change.id} change={change} checked={selected.has(change.id)} onToggle={() => onToggle(change.id)} currency={currency} />
          ))}
        </div>
      ) : (
        <p className="text-[15px] leading-snug text-muted-foreground">Nothing on the quote matched that. Try saying it another way.</p>
      )}

      {clarifications.length > 0 && (
        <div className="rounded-2xl border border-[hsl(var(--amber-border))] bg-[hsl(var(--amber-surface))] px-4 py-3 text-[hsl(var(--amber-ink))]">
          <p className="text-[14px] font-semibold">Left unchanged</p>
          <ul className="mt-1 space-y-1 text-[14px] leading-snug">
            {clarifications.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </div>
      )}

      {preview && changes.length > 0 && (
        <div className="flex items-baseline justify-between gap-3 text-[15px]">
          <span className="text-muted-foreground">Total incl. GST</span>
          <span className="tabular-money text-right">
            <span className="text-muted-foreground">{formatMoney(preview.before, currency)}</span>
            <span aria-hidden="true" className="px-1.5 text-muted-foreground">→</span>
            <span className="sr-only"> becomes </span>
            <span className="font-semibold text-foreground">{preview.after != null ? formatMoney(preview.after, currency) : "Recalculated on save"}</span>
          </span>
        </div>
      )}
    </div>
  );
}