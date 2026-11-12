import { ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

const safeguards = ["Your spoken price always comes first", "Outlier prices flagged against your rate card", "Recordings saved on your phone before upload", "Acceptance recorded with name, time and IP"];

export default function PremiumTrust() {
  return (
    <section className="premium-section premium-container">
      <div className="trust-section">
        <div className="section-heading !mb-0">
          <h2>Your reputation.<br /><span>In safe hands.</span></h2>
          <p className="section-description">Automation where it helps. Your judgement where it matters. Every quote is yours to review before it goes out.</p>
          <Link to="/app" className="premium-link mt-3">Start quoting with confidence <ChevronRight size={18} /></Link>
        </div>
        <ul className="trust-list">{safeguards.map((text) => <li key={text}>{text}</li>)}</ul>
      </div>
    </section>
  );
}