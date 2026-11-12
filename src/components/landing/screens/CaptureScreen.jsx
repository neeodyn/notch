import { Camera, Check, X } from "lucide-react";
import { Image } from "@/components/ui/image";
import PhoneStatusBar from "@/components/landing/screens/PhoneStatusBar";
import { NZ_IMAGERY } from "@/lib/nzImagery";

/** The house-walk screen: the camera view, one running recording, a Snap button. */
export default function CaptureScreen() {
  return (
    <div className="phone-screen phone-screen-dark">
      <Image src={NZ_IMAGERY.lounge} alt="" focalPointX={0.42} focalPointY={0.5} className="absolute inset-0 block h-full w-full object-cover" />
      <PhoneStatusBar />

      <div className="relative z-10 flex items-center justify-between px-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60"><X size={14} /></span>
        <span className="tabular-money flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-[12px] font-semibold">
          <span className="h-2 w-2 rounded-full bg-red-500" />0:14
          <span className="voice-bars voice-bars-light"><span /><span /><span /><span /><span /></span>
        </span>
        <span className="w-8" />
      </div>
      <p className="relative z-10 mx-auto mt-2 rounded-full bg-black/60 px-3 py-1 text-[10px] font-medium text-zinc-200">
        Say room, size, surfaces, coats and price
      </p>

      <div className="relative z-10 mt-auto rounded-t-[24px] bg-black/60 px-4 pb-5 pt-3.5">
        <span className="relative mb-3 block h-11 w-11 overflow-hidden rounded-[10px] border border-white/45">
          <Image src={NZ_IMAGERY.lounge} alt="" className="block h-full w-full object-cover" />
          <span className="absolute left-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold">1</span>
        </span>
        <div className="flex items-center justify-between">
          <span className="w-16 text-[11px] font-medium text-zinc-300">1 snapped</span>
          <span className="flex h-[66px] w-[66px] flex-col items-center justify-center gap-0.5 rounded-full border-[3px] border-white bg-white/20">
            <Camera size={20} />
            <span className="text-[9px] font-semibold">Snap</span>
          </span>
          <span className="flex h-10 w-16 items-center justify-center gap-1 rounded-xl bg-primary text-[12px] font-semibold text-primary-foreground">
            <Check size={13} />Done
          </span>
        </div>
      </div>
    </div>
  );
}