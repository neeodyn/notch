import { formatMoney } from "@/lib/pricing";

export default function WorkspaceOverview({ walked, sent, acceptedTotal, currency }) {
  const metrics = [{ label: "Jobs walked", value: walked }, { label: "Quotes sent", value: sent }];
  return (
    <section className="workspace-overview" aria-label="This week summary">
      <p className="text-[15px] font-medium opacity-60">Accepted this week, incl. GST</p>
      <p className="tabular-money mt-2 font-display text-[44px] font-semibold leading-none tracking-[-0.05em] sm:text-[56px]">{formatMoney(acceptedTotal, currency)}</p>
      <div className="ink-rule mt-7 grid grid-cols-2 gap-3 border-t pt-5">{metrics.map(({ label, value }) => <div key={label}><p className="tabular-money text-[24px] font-semibold leading-none tracking-[-0.03em]">{value}</p><p className="mt-1.5 text-[13px] opacity-60">{label}</p></div>)}</div>
    </section>
  );
}