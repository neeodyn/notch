import { BatteryFull, Signal, Wifi } from "lucide-react";

export default function PhoneStatusBar() {
  return (
    <div className="phone-status" aria-hidden="true">
      <span className="tabular-money">9:41</span>
      <span className="flex items-center gap-1">
        <Signal size={12} strokeWidth={2.4} />
        <Wifi size={12} strokeWidth={2.4} />
        <BatteryFull size={15} strokeWidth={2} />
      </span>
    </div>
  );
}