import { PaintRoller, Printer } from "lucide-react";
import { Image } from "@/components/ui/image";

export default function ProposalHeader({ business }) {
  return (
    <header className="proposal-brand print-card">
      <div className="flex items-center gap-3.5">
        {business?.logo_url ? <Image src={business.logo_url} alt={business.name} className="h-[52px] w-[52px] rounded-2xl object-cover" /> : <span className="proposal-monogram"><PaintRoller size={21} strokeWidth={1.6} /></span>}
        <div><h1 className="text-[19px] font-semibold leading-tight tracking-[-0.03em]">{business?.name}</h1><div className="mt-1 flex flex-wrap gap-x-3 text-[13px] text-muted-foreground"><span>Painting & decorating</span>{business?.phone && <a href={`tel:${business.phone}`} className="hover:text-foreground">{business.phone}</a>}{business?.gst_number && <span>GST {business.gst_number}</span>}</div></div>
      </div>
      <button type="button" onClick={() => window.print()} className="proposal-print no-print" aria-label="Print or save proposal as PDF"><Printer size={15} /><span className="hidden sm:inline">Print / PDF</span></button>
    </header>
  );
}