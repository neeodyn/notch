import StatusPill from "@/components/notch/StatusPill";
import { formatMoney } from "@/lib/pricing";

export default function SharePreviewCard({ quote, businessName, total, currency }) {
  return (
    <div className="rounded-[24px] bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-[13px] font-medium text-muted-foreground">{businessName || "Your business"}</p>
        <StatusPill status={quote.status} />
      </div>
      <p className="mt-3 truncate text-[20px] font-semibold tracking-[-0.02em] text-foreground">{quote.client_name || "Homeowner"}</p>
      <p className="truncate text-[15px] text-muted-foreground">{quote.address || "No address on the quote yet"}</p>
      <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-border pt-3">
        <span className="text-[14px] text-muted-foreground">Total incl. GST</span>
        <span className="tabular-money text-[22px] font-semibold tracking-[-0.02em] text-foreground">{formatMoney(total, currency)}</span>
      </div>
    </div>
  );
}