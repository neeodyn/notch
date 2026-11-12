import { Image } from "@/components/ui/image";
import PhoneFrame from "@/components/landing/PhoneFrame";
import SpokenLine from "@/components/landing/SpokenLine";
import CaptureScreen from "@/components/landing/screens/CaptureScreen";
import { NZ_IMAGERY } from "@/lib/nzImagery";

/** The painter mid-walk, and what his phone is doing while he talks. */
export default function HeroStage() {
  return (
    <div className="hero-stage">
      <figure className="photo-tile">
        <Image
          src={NZ_IMAGERY.walk}
          alt="A painter in white overalls walks through a villa lounge, describing the room into his phone"
          focalPointX={0.55}
          focalPointY={0.45}
          className="absolute inset-0 block h-full w-full object-cover"
        />
        <SpokenLine>“Lounge, five by four. Walls and ceiling, two coats. Eleven&nbsp;hundred.”</SpokenLine>
      </figure>
      <div className="device-tile">
        <PhoneFrame label="The Notch house-walk screen: a recording timer over the camera view of the same lounge, one photo snapped, and Snap and Done buttons">
          <CaptureScreen />
        </PhoneFrame>
      </div>
    </div>
  );
}