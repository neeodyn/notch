import { Calculator, ClipboardCheck, Images, Mic, Undo2 } from "lucide-react";
import PhoneFrame from "@/components/landing/PhoneFrame";
import StepCopy from "@/components/landing/StepCopy";
import ReviewScreen from "@/components/landing/screens/ReviewScreen";

const POINTS = [
  [Calculator, "Wall and ceiling areas worked out"],
  [Images, "Photos matched to the right room"],
  [Mic, "Say “hallway is four fifty” and it’s changed"],
  [Undo2, "Undo any change in a tap"],
];

export default function CheckStep() {
  return (
    <article className="step step-flip">
      <StepCopy
        number="02"
        icon={ClipboardCheck}
        title="Check it. Change it by voice."
        body="Every room arrives measured and matched to its photo, with your price beside it. If something’s off, say the change or tap to edit it."
        points={POINTS}
      />
      <div className="step-visual">
        <PhoneFrame className="step-before" label="The Notch review screen: the client, the lounge and hallway with their measured areas and spoken prices, and the total including GST">
          <ReviewScreen />
        </PhoneFrame>
        <PhoneFrame label="The same review screen after a spoken change: the hallway is now $450 and the total has updated, with an Undo button">
          <ReviewScreen edited />
        </PhoneFrame>
      </div>
    </article>
  );
}