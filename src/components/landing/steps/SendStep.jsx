import { BellRing, Link2, ListChecks, PenLine, Send } from "lucide-react";
import { Image } from "@/components/ui/image";
import PhoneFrame from "@/components/landing/PhoneFrame";
import StepCopy from "@/components/landing/StepCopy";
import ProposalScreen from "@/components/landing/screens/ProposalScreen";
import { NZ_IMAGERY } from "@/lib/nzImagery";

const POINTS = [
  [Link2, "A private link, sent by text or email"],
  [ListChecks, "Optional extras the homeowner can add"],
  [PenLine, "Accepted with their name, date and time"],
  [BellRing, "An email when it’s opened and accepted"],
];

export default function SendStep() {
  return (
    <article className="step">
      <StepCopy
        number="03"
        icon={Send}
        title="Send it. They accept on their phone."
        body="The homeowner opens a clear proposal with the scope, the photos and the total including GST. No app to install and no login."
        points={POINTS}
      />
      <div className="step-visual step-duo">
        <div className="step-duo-device">
          <PhoneFrame interactive label="The homeowner’s view of the quote. Tick the optional hallway ceiling to see the total change">
            <ProposalScreen />
          </PhoneFrame>
        </div>
        <div className="step-duo-photo">
          <Image
            src={NZ_IMAGERY.homeowner}
            alt="A homeowner reads her painting quote on her phone at the kitchen table, colour swatches beside her"
            focalPointX={0.5}
            focalPointY={0.4}
            className="absolute inset-0 block h-full w-full object-cover"
          />
        </div>
      </div>
    </article>
  );
}