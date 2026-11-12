import { Link } from "@tanstack/react-router";
import { CONSUMER_RIGHTS_NOTICE } from "@/lib/legal";

export default function ProposalTerms({ terms, currency = "NZD" }) {
  return (
    <section className="proposal-terms print-card">
      {terms && (
        <>
          <h2 className="text-foreground">Terms &amp; workmanship notes</h2>
          <p className="mt-2 whitespace-pre-line text-muted-foreground">{terms}</p>
        </>
      )}
      <p className="mt-4 text-muted-foreground">
        All prices are in {currency}. {CONSUMER_RIGHTS_NOTICE}
      </p>
      <p className="no-print mt-4 text-muted-foreground">
        Quote delivered with Notch ·{" "}
        <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
      </p>
    </section>
  );
}