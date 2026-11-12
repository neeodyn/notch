import { BadgeCheck } from "lucide-react";
import { formatMoney } from "@/lib/pricing";
import { formatNzDateTime } from "@/lib/legal";

export default function ProposalAcceptanceRecord({ name, acceptedAt, total, currency, reference }) {
  if (!acceptedAt) return null;
  return (
    <section aria-labelledby="acceptance-record" className="print-card rounded-[28px] border border-border p-6 sm:p-8">
      <div className="flex items-center gap-2.5">
        <BadgeCheck className="h-5 w-5 text-primary" />
        <h2 id="acceptance-record" className="text-[17px] font-semibold tracking-[-0.02em]">Accepted electronically</h2>
      </div>
      <dl className="mt-5 grid gap-4 text-[15px] sm:grid-cols-3">
        <div><dt className="text-[13px] text-muted-foreground">Signed by</dt><dd className="mt-1 font-semibold">{name || "Client"}</dd></div>
        <div><dt className="text-[13px] text-muted-foreground">Date and time</dt><dd className="mt-1 font-semibold">{formatNzDateTime(acceptedAt)}</dd></div>
        <div><dt className="text-[13px] text-muted-foreground">Accepted total</dt><dd className="tabular-money mt-1 font-semibold">{formatMoney(total, currency)} incl. GST</dd></div>
      </dl>
      <p className="mt-5 border-t border-border pt-4 text-[13px] leading-relaxed text-muted-foreground">
        Quote {reference} was accepted by typing a full name and agreeing to this quote and its terms. The date, time, IP address and device were recorded with the acceptance.
      </p>
    </section>
  );
}