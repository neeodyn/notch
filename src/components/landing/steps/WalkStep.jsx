import { BadgeDollarSign, Camera, Layers, Mic, Ruler } from "lucide-react";
import { Image } from "@/components/ui/image";
import SpokenLine from "@/components/landing/SpokenLine";
import StepCopy from "@/components/landing/StepCopy";
import { NZ_IMAGERY } from "@/lib/nzImagery";

const POINTS = [
  [Ruler, "Room size and stud height"],
  [Layers, "Surfaces, coats and prep"],
  [Camera, "A photo of each room as you go"],
  [BadgeDollarSign, "Your price, said out loud"],
];

export default function WalkStep() {
  return (
    <article className="step">
      <StepCopy
        number="01"
        icon={Mic}
        title="Walk and talk."
        body="One continuous recording, inside and out. Describe each room the way you’d brief your crew, and snap a photo as you go."
        points={POINTS}
      />
      <figure className="step-visual step-photo">
        <Image
          src={NZ_IMAGERY.exteriorWalk}
          alt="A painter in white overalls looks up at the soffits of a weatherboard house, phone in hand"
          focalPointX={0.55}
          focalPointY={0.45}
          className="absolute inset-0 block h-full w-full object-cover"
        />
        <SpokenLine>“Front of the house. Weatherboards sixty-two square metres, soffits fourteen, fascia twenty-two&nbsp;metres.”</SpokenLine>
      </figure>
    </article>
  );
}