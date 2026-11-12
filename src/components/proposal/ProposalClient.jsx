import { MapPin, ArrowDownRight } from "lucide-react";

export default function ProposalClient({ quote }) {
  return (
    <section className="proposal-client print-card">
      <div className="flex items-start justify-between gap-5"><div><p className="eyebrow">A PROPOSAL FOR YOUR HOME</p><h2 className="mt-4 font-display text-[36px] font-semibold leading-[1.08] tracking-[-0.055em] sm:text-[48px]">Beautiful spaces.<br /><span className="text-muted-foreground">Thoughtfully finished.</span></h2></div><ArrowDownRight size={28} strokeWidth={1.2} className="mt-1 shrink-0 text-primary/60" /></div>
      <div className="mt-8 flex flex-wrap items-start justify-between gap-4 border-t border-border/60 pt-5"><div><p className="eyebrow mb-1.5">PREPARED FOR</p><p className="text-base font-semibold">{quote.client_name || "Homeowner"}</p></div>{quote.address && <div className="max-w-xs"><p className="eyebrow mb-1.5">THE PROPERTY</p><p className="flex items-start gap-1.5 text-sm"><MapPin size={13} className="mt-1 shrink-0 text-muted-foreground" />{quote.address}</p></div>}</div>
      {quote.notes && <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{quote.notes}</p>}
    </section>
  );
}