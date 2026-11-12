import { ArrowUpRight, CircleCheck, Send, Footprints } from "lucide-react";
import { formatMoney } from "@/lib/pricing";

export default function WorkspaceOverview({ walked, sent, acceptedTotal, currency }) {
  const metrics = [{ label: "Jobs walked", value: walked, icon: Footprints }, { label: "Quotes sent", value: sent, icon: Send }, { label: "Accepted · incl. GST", value: formatMoney(acceptedTotal, currency), icon: CircleCheck }];
  return (
    <section className="workspace-overview" aria-label="This week summary">
      <div className="mb-6 flex items-center justify-between"><p className="text-xs font-medium tracking-wide opacity-70">YOUR WEEK AT A GLANCE</p><ArrowUpRight size={17} className="opacity-50" /></div>
      <div className="grid grid-cols-3 gap-3">{metrics.map(({ label, value, icon: Icon }) => <div key={label}><Icon size={16} strokeWidth={1.5} className="mb-3 opacity-60" /><p className="tabular-money text-[21px] font-semibold tracking-tight sm:text-[29px]">{value}</p><p className="mt-1 text-[10px] opacity-60 sm:text-xs">{label}</p></div>)}</div>
    </section>
  );
}