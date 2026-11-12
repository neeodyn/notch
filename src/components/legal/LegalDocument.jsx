import { Link } from "@tanstack/react-router";
import { PaintRoller } from "lucide-react";
import LegalSection from "@/components/legal/LegalSection";
import { LEGAL_CONTACT, LEGAL_UPDATED } from "@/lib/legal";

const NAV_LINK = "text-muted-foreground transition-colors hover:text-foreground";

export default function LegalDocument({ title, intro, sections }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="premium-container flex h-16 items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2.5 text-[17px] font-semibold tracking-[-0.03em]">
          <span className="brand-mark"><PaintRoller size={15} /></span>
          notch
        </Link>
        <nav aria-label="Legal" className="flex gap-6 text-[14px] font-medium">
          <Link to="/terms" className={NAV_LINK} activeProps={{ className: "text-foreground" }}>Terms</Link>
          <Link to="/privacy" className={NAV_LINK} activeProps={{ className: "text-foreground" }}>Privacy</Link>
        </nav>
      </header>

      <main className="premium-container pb-24">
        <article className="mx-auto max-w-[680px] pt-14 sm:pt-20">
          <p className="eyebrow">Last updated {LEGAL_UPDATED}</p>
          <h1 className="mt-3 font-display text-[40px] font-semibold leading-[1.04] tracking-[-0.045em] sm:text-[56px]">
            {title}
          </h1>
          <p className="mt-5 text-[19px] leading-[1.45] text-muted-foreground">{intro}</p>
          <ol className="mt-12 border-t border-border">
            {sections.map((section, idx) => (
              <LegalSection key={section.heading} index={idx + 1} {...section} />
            ))}
          </ol>
          <p className="mt-10 text-[15px] leading-relaxed text-muted-foreground">
            Questions? Contact {LEGAL_CONTACT.entity}
            {LEGAL_CONTACT.email ? (
              <> at <a href={`mailto:${LEGAL_CONTACT.email}`} className="text-primary hover:underline">{LEGAL_CONTACT.email}</a>.</>
            ) : (
              " by replying to any email you have received from Notch."
            )}
          </p>
        </article>
      </main>
    </div>
  );
}