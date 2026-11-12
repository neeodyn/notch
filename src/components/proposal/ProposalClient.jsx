export default function ProposalClient({ quote }) {
  return (
    <section className="proposal-client print-card">
      <p className="text-[15px] font-medium text-muted-foreground">A proposal for your home</p>
      <h2 className="mt-3 font-display text-[40px] font-semibold leading-[1.04] tracking-[-0.045em] sm:text-[60px]">Beautiful spaces.<br /><span className="text-muted-foreground/75">Thoughtfully finished.</span></h2>
      <div className="mt-9 grid gap-6 border-t border-border pt-6 sm:grid-cols-2">
        <div><p className="text-[13px] text-muted-foreground">Prepared for</p><p className="mt-1 text-[19px] font-semibold leading-snug tracking-[-0.02em]">{quote.client_name || "Homeowner"}</p></div>
        {quote.address && <div><p className="text-[13px] text-muted-foreground">The property</p><p className="mt-1 text-[19px] font-semibold leading-snug tracking-[-0.02em]">{quote.address}</p></div>}
      </div>
      {quote.notes && <p className="mt-6 text-[15px] leading-relaxed text-muted-foreground">{quote.notes}</p>}
    </section>
  );
}