import { formatMoney } from "@/lib/pricing";

export default function ProposalTotals({ totals, currency, quote, hasOptional }) {
  return (
    <section className="proposal-totals print-card">
      <p className="mb-6 text-[15px] font-medium text-muted-foreground">Your investment</p>
      <div className="tabular-money space-y-3 text-[15px] text-muted-foreground">
        {!totals.pricesIncludeGst && <div className="flex justify-between"><span>Base scope</span><span>{formatMoney(totals.baseItemsSum, currency)}</span></div>}
        {hasOptional && <div className="flex justify-between"><span>Selected optional extras</span><span>{formatMoney(totals.optionalSum, currency)}</span></div>}
        {totals.minChargeApplied && <div className="flex justify-between"><span>Minimum crew charge adjustment</span><span>+{formatMoney(totals.minChargeDelta, currency)}</span></div>}
        <div className="flex justify-between border-t border-foreground/10 pt-4"><span>Subtotal (excl. GST)</span><span className="text-foreground">{formatMoney(totals.subtotalExclGst, currency)}</span></div>
        <div className="flex justify-between"><span>GST ({totals.gstPctLabel}%)</span><span className="text-foreground">{formatMoney(totals.gstAmount, currency)}</span></div>
      </div>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-3 border-t border-foreground/10 pt-6"><div><p className="text-[17px] font-semibold">Total investment</p><p className="text-[13px] text-muted-foreground">Including {totals.gstPctLabel}% GST</p></div><p className="tabular-money font-display text-[40px] font-semibold leading-none tracking-[-0.05em] sm:text-[56px]">{formatMoney(totals.totalInclGst, currency)}</p></div>
      {Number(quote.deposit_pct) > 0 && <div className="tabular-money mt-6 flex justify-between rounded-2xl bg-background px-4 py-3.5 text-[15px] font-medium"><span>Deposit upon booking ({quote.deposit_pct}%)</span><span>{formatMoney(totals.depositAmount, currency)}</span></div>}
    </section>
  );
}