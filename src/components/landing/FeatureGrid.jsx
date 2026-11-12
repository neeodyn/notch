import { BadgeDollarSign, Calculator, House, MessageSquareText, Receipt, WifiOff } from "lucide-react";

const FEATURES = [
  [Calculator, "Areas worked out for you", "Say five by four with a 2.4 stud. Notch works out the wall and ceiling square metres, less your allowance for doors and windows."],
  [House, "Exteriors, measured properly", "Weatherboards and soffits by the square metre. Fascia by the linear metre."],
  [Receipt, "GST shown clearly", "Every quote shows the total excluding GST, the 15% GST and the total including GST."],
  [BadgeDollarSign, "Your rate card as a backstop", "Set your rates by surface, prep and coats. A room you didn’t price out loud gets an estimate, and odd prices get flagged."],
  [WifiOff, "Fine with patchy signal", "Your walk is saved on your phone first. If the upload drops, send it again once you’re back in range."],
  [MessageSquareText, "Follow-ups drafted", "One tap drafts a friendly text for a quote that has gone quiet."],
];

export default function FeatureGrid() {
  return (
    <section className="premium-section premium-container">
      <div className="section-heading">
        <h2>Built around the way<br /><span>you already&nbsp;price.</span></h2>
        <p className="section-description">Square metres, linear metres, coats, prep and GST. The trade details are already in there.</p>
      </div>
      <ul className="feature-grid">
        {FEATURES.map(([Icon, title, body]) => (
          <li key={title} className="feature-card">
            <span className="feature-icon"><Icon size={22} /></span>
            <div><h3>{title}</h3><p>{body}</p></div>
          </li>
        ))}
      </ul>
    </section>
  );
}