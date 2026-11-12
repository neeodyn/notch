import { formatNzDate, getQuoteDates, quoteReference } from "@/lib/legal";

export default function ProposalClient({ quote }) {
  const { issuedAt, validUntil } = getQuoteDates(quote);
  return (
    <section className="proposal-client print-card">
      <p className="text-[15px] font-medium text-muted-foreground">A proposal for your home</p>
      <h2 className="mt-2 font-display text-[34px] font-semibold leading-[1.06] tracking-[-0.045em] [text-wrap:balance] sm:mt-3 sm:text-[60px]">Beautiful spaces.<br /><span className="text-muted-foreground/75">Thoughtfully finished.</span></h2>
      <div className="mt-7 grid gap-5 border-t border-border pt-5 sm:mt-9 sm:grid-cols-2 sm:gap-6 sm:pt-6">
        <div><p className="text-[13px] text-muted-foreground">Prepared for</p><p className="mt-1 text-[19px] font-semibold leading-snug tracking-[-0.02em]">{quote.client_name || "Homeowner"}</p></div>
        {quote.address && <div><p className="text-[13px] text-muted-foreground">The property</p><p className="mt-1 text-[19px] font-semibold leading-snug tracking-[-0.02em]">{quote.address}</p></div>}
      </div>
      <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-border pt-5 text-[14px]">
        <div><dt className="text-[13px] text-muted-foreground">Quote</dt><dd className="tabular-money mt-1 font-semibold">{quoteReference(quote)}</dd></div>
        <div><dt className="text-[13px] text-muted-foreground">Issued</dt><dd className="mt-1 font-semibold">{formatNzDate(issuedAt)}</dd></div>
        <div><dt className="text-[13px] text-muted-foreground">Valid until</dt><dd className="mt-1 font-semibold">{formatNzDate(validUntil)}</dd></div>
      </dl>
      {quote.notes && <p className="mt-6 text-[15px] leading-relaxed text-muted-foreground">{quote.notes}</p>}
    </section>
  );
}