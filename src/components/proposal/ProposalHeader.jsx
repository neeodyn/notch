import { PaintRoller, Phone, Printer } from "lucide-react";
import { Image } from "@/components/ui/image";

export default function ProposalHeader({ business }) {
  return (
    <header className="proposal-brand glass-panel print-card">
      <div className="flex items-center gap-3.5">
        {business?.logo_url ? <Image src={business.logo_url} alt={business.name} className="h-14 w-14 rounded-[18px] object-cover" /> : <span className="proposal-monogram"><PaintRoller size={22} strokeWidth={1.5} /></span>}
        <div><p className="eyebrow mb-1">PAINTING & DECORATING</p><h1 className="text-lg font-semibold tracking-tight sm:text-xl">{business?.name}</h1><div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">{business?.phone && <a href={`tel:${business.phone}`} className="inline-flex items-center gap-1.5 hover:text-foreground"><Phone size={11} />{business.phone}</a>}{business?.gst_number && <span>GST {business.gst_number}</span>}</div></div>
      </div>
      <button type="button" onClick={() => window.print()} className="proposal-print no-print" aria-label="Print or save proposal as PDF"><Printer size={16} /><span className="hidden sm:inline">Print / PDF</span></button>
    </header>
  );
}