import { Camera, Ruler, Mic, FileCheck, ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

const steps = [
  { icon: Camera, title: "Walk. Talk. Capture.", body: "One continuous recording. Say room dimensions, surfaces, coats and prices. Snap each room as you go.", detail: "Your site visit, captured naturally." },
  { icon: Ruler, title: "The details, done.", body: "Wall and ceiling areas calculated. Photos matched to rooms. Spoken prices kept exact, with your rate card there when you need it.", detail: "Square metres and 15% GST, handled." },
  { icon: Mic, title: "A change? Just say it.", body: "Say ‘hallway is four fifty’ or tap to adjust a coat. Review the change and undo it in a tap.", detail: "You stay in control of every number." },
  { icon: FileCheck, title: "Send with confidence.", body: "Share a beautifully clear proposal. Homeowners choose optional extras, see their total and sign from their phone.", detail: "A professional finish, before the first coat." },
];
export default function PremiumWorkflow() {
  return (
    <section id="how-it-works" className="premium-section">
      <div className="section-heading"><div><p className="eyebrow">FROM WALK-THROUGH TO SIGN-OFF</p><h2>One seamless flow.<br /><span className="text-muted-foreground">Nothing between you and the job.</span></h2></div><p className="section-description">Built around how painters actually work.<br />Not another form to fill in.</p></div>
      <div className="workflow-grid">
        {steps.map(({ icon: Icon, title, body, detail }, i) => (
          <article key={title} className="workflow-step">
            <div className="flex items-center justify-between"><span className="workflow-icon"><Icon size={23} strokeWidth={1.5} /></span><span className="text-xs font-medium tracking-widest text-muted-foreground/50">0{i + 1}</span></div>
            <h3 className="mt-8 text-xl font-semibold tracking-tight">{title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p><p className="mt-6 border-t border-border/70 pt-4 text-xs font-medium text-foreground/75">{detail}</p>
          </article>
        ))}
      </div>
      <Link to="/app" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary">Make your next quote a better one <ArrowUpRight size={16} /></Link>
    </section>
  );
}