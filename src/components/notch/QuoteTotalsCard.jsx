import { formatMoney } from "@/lib/pricing";
import { RESIDENTIAL_CONTRACT_THRESHOLD } from "@/lib/legal";

function Row({ label, value, strong = false }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "border-t border-border pt-2.5 text-[18px] font-bold text-foreground" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span className={`tabular-money ${strong ? "" : "font-medium text-foreground"}`}>{value}</span>
    </div>
  );
}

export default function QuoteTotalsCard({ totals, currency, depositPct = 0 }) {
  return (
    <section aria-label="Quote totals" className="apple-surface space-y-2 rounded-[20px] border border-border bg-card p-5 text-[15px]">
      <Row label="Subtotal (excl. GST)" value={formatMoney(totals.subtotalExclGst, currency)} />
      {totals.minChargeApplied && (
        <Row label="Minimum job charge adjustment" value={`+${formatMoney(totals.minChargeDelta, currency)}`} />
      )}
      <Row label={`GST (${totals.gstPctLabel}%)`} value={formatMoney(totals.gstAmount, currency)} />
      <Row strong label="Total (incl. GST)" value={formatMoney(totals.totalInclGst, currency)} />
      {depositPct > 0 && (
        <div className="flex justify-between text-[14px] font-semibold text-primary">
          <span>Deposit ({depositPct}%)</span>
          <span className="tabular-money">{formatMoney(totals.depositAmount, currency)}</span>
        </div>
      )}
      {totals.totalInclGst >= RESIDENTIAL_CONTRACT_THRESHOLD && (
        <p className="border-t border-border pt-2.5 text-[13px] leading-snug text-muted-foreground">
          Residential jobs of $30,000 or more incl. GST need a written contract, plus the prescribed checklist and disclosure statement, under the Building Act 2004.
        </p>
      )}
    </section>
  );
}