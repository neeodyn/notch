import { ChevronRight } from "lucide-react";
import StartLink from "@/components/landing/StartLink";

const safeguards = ["Your spoken price always comes first", "Outlier prices flagged against your rate card", "Recordings saved on your phone before upload", "Acceptance recorded with name, time and IP", "A reminder when a job reaches $30,000 and needs a written contract"];

export default function PremiumTrust() {
  return (
    <section className="premium-section premium-container">
      <div className="trust-section">
        <div className="section-heading !mb-0">
          <h2>Your reputation.<br /><span>In safe hands.</span></h2>
          <p className="section-description">Automation where it helps. Your judgement where it matters. Every quote is yours to review before it goes out.</p>
          <StartLink className="premium-link mt-3" trailing={<ChevronRight size={18} />}>Start quoting with confidence</StartLink>
        </div>
        <ul className="trust-list">{safeguards.map((text) => <li key={text}>{text}</li>)}</ul>
      </div>
    </section>
  );
}