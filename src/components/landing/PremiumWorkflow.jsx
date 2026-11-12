import StartLink from "@/components/landing/StartLink";
import { ChevronRight } from "lucide-react";
import ScrollRevealText from "@/components/landing/ScrollRevealText";
import CaptureVignette from "@/components/landing/vignettes/CaptureVignette";
import MeasureVignette from "@/components/landing/vignettes/MeasureVignette";
import EditVignette from "@/components/landing/vignettes/EditVignette";
import SignVignette from "@/components/landing/vignettes/SignVignette";

const tiles = [
  { title: "Walk. Talk. Capture.", body: "One continuous recording. Say room dimensions, surfaces, coats and prices. Snap each room as you go.", Visual: CaptureVignette, className: "bento-wide", fill: true },
  { title: "The details, done.", body: "Wall and ceiling areas calculated. Photos matched to rooms. Spoken prices kept exact, with your rate card there when you need it.", Visual: MeasureVignette, className: "" },
  { title: "A change? Just say it.", body: "Say ‘hallway is four fifty’ or tap to adjust a coat. Review the change and undo it in a tap.", Visual: EditVignette, className: "bento-ink" },
  { title: "Send with confidence.", body: "Share a beautifully clear proposal. Homeowners choose optional extras, see their total and sign from their phone.", Visual: SignVignette, className: "bento-wide" },
];

export default function PremiumWorkflow() {
  return (
    <section id="how-it-works" className="premium-section premium-container">
      <ScrollRevealText className="statement" text="One seamless flow. Walk the house once and every room is measured, every photo matched, every price kept exactly as you said it. By the time you’re back at the ute, the quote is ready to send." />
      <div className="bento">
        {tiles.map(({ title, body, Visual, className, fill }) => (
          <article key={title} className={`bento-tile ${className}`}>
            <div className="bento-copy"><h3>{title}</h3><p>{body}</p></div>
            <div className={fill ? "bento-visual bento-visual-fill" : "bento-visual"}><Visual /></div>
          </article>
        ))}
      </div>
      <StartLink className="premium-link mt-8" trailing={<ChevronRight size={18} />}>Make your next quote a better one</StartLink>
    </section>
  );
}