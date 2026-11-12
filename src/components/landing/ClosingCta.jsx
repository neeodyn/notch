import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { Image } from "@/components/ui/image";
import StartLink from "@/components/landing/StartLink";
import { SAMPLE_QUOTE_TOKEN } from "@/components/sample/sampleQuoteData";
import { NZ_IMAGERY } from "@/lib/nzImagery";

export default function ClosingCta() {
  return (
    <section className="premium-section premium-container">
      <div className="closing">
        <div className="closing-photo">
          <Image
            src={NZ_IMAGERY.ute}
            alt="A painter sits on the tailgate of his ute outside a white villa, sending a quote from his phone"
            focalPointX={0.5}
            focalPointY={0.45}
            className="absolute inset-0 block h-full w-full object-cover"
          />
        </div>
        <div className="closing-copy">
          <h2>Sent before you’ve<br />left the&nbsp;driveway.</h2>
          <p>Try it on your next quote. One walk through the house is all it takes.</p>
          <div className="closing-actions">
            <StartLink className="premium-button">Start your free trial</StartLink>
            <Link to="/q/$token" params={{ token: SAMPLE_QUOTE_TOKEN }} className="premium-link">See a sample quote <ChevronRight size={18} /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}