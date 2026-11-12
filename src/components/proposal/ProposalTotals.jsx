import { formatMoney } from "@/lib/pricing";

export default function ProposalTotals({ totals, currency, quote, hasOptional }) {
  return (
    <section className="proposal-totals glass-panel print-card">
      <p className="eyebrow mb-6">YOUR INVESTMENT</p>
      <div className="space-y-3 text-sm text-muted-foreground">
        {!totals.pricesIncludeGst && <div className="flex justify-between"><span>Base scope</span><span className="tabular-money">{formatMoney(totals.baseItemsSum, currency)}</span></div>}
        {hasOptional && <div className="flex justify-between"><span>Selected optional extras</span><span className="tabular-money">{formatMoney(totals.optionalSum, currency)}</span></div>}
        {totals.minChargeApplied && <div className="flex justify-between"><span>Minimum crew charge adjustment</span><span className="tabular-money">+{formatMoney(totals.minChargeDelta, currency)}</span></div>}
        <div className="flex justify-between border-t border-border/60 pt-4"><span>Subtotal (excl. GST)</span><span className="tabular-money text-foreground">{formatMoney(totals.subtotalExclGst, currency)}</span></div>
        <div className="flex justify-between"><span>GST ({totals.gstPctLabel}%)</span><span className="tabular-money text-foreground">{formatMoney(totals.gstAmount, currency)}</span></div>
      </div>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-3 border-t border-border/60 pt-6"><div><p className="text-sm font-medium">Total investment</p><p className="mt-1 text-[11px] text-muted-foreground">Including {totals.gstPctLabel}% GST</p></div><p className="tabular-money text-[34px] font-semibold leading-none tracking-[-0.055em] sm:text-[42px]">{formatMoney(totals.totalInclGst, currency)}</p></div>
      {Number(quote.deposit_pct) > 0 && <div className="mt-5 flex justify-between rounded-2xl bg-primary/5 px-4 py-3 text-xs font-medium"><span>Deposit upon booking ({quote.deposit_pct}%)</span><span className="tabular-money">{formatMoney(totals.depositAmount, currency)}</span></div>}
    </section>
  );
}