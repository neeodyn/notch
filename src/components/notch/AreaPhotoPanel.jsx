import { useState } from "react";
import { Crosshair, X } from "lucide-react";
import { Image } from "@/components/ui/image";
import PhotoMoveMenu from "@/components/notch/PhotoMoveMenu";
import AreaPhotoThumbs from "@/components/notch/AreaPhotoThumbs";

const OVERLAY_BUTTON =
  "flex min-h-[36px] items-center gap-1.5 rounded-xl px-3 text-[12px] font-semibold text-white backdrop-blur-md";

export default function AreaPhotoPanel({ item, photos = [], targets = [], onMovePin, onMovePhoto }) {
  const [activeId, setActiveId] = useState(null);
  const [markingSpot, setMarkingSpot] = useState(false);
  const photo = photos.find((p) => p.id === activeId) || photos[0];
  if (!photo?.url) return null;

  const hasSpotPin = photo.pin_x != null && photo.pin_y != null;

  function handlePhotoTap(e) {
    if (!onMovePin || (!markingSpot && !hasSpotPin)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pin_x = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width));
    const pin_y = Math.max(0.05, Math.min(0.95, (e.clientY - rect.top) / rect.height));
    onMovePin(photo.id, pin_x, pin_y);
    setMarkingSpot(false);
  }

  return (
    <div>
      <div
        onClick={handlePhotoTap}
        className={`relative aspect-[16/10] w-full overflow-hidden bg-secondary ${
          markingSpot || hasSpotPin ? "cursor-crosshair" : ""
        }`}
      >
        <Image src={photo.url} alt={item.name || `Area ${item.area_number}`} className="h-full w-full object-cover" />

        <span className="tabular-money absolute left-2.5 top-2.5 rounded-full bg-background/95 px-2.5 py-1 text-[12px] font-semibold text-foreground">
          Photo {photo.snap_number}
        </span>

        <div className="absolute right-2.5 top-2.5" onClick={(e) => e.stopPropagation()}>
          <PhotoMoveMenu photo={photo} targets={targets} currentItemId={item.id} onMove={onMovePhoto} tone="overlay" />
        </div>

        {hasSpotPin && (
          <span
            style={{ left: `${photo.pin_x * 100}%`, top: `${photo.pin_y * 100}%` }}
            className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-primary text-[13px] font-bold text-white shadow-md"
          >
            {item.area_number}
          </span>
        )}

        <div className="absolute bottom-2.5 right-2.5">
          {hasSpotPin ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMovePin(photo.id, null, null);
              }}
              className={`${OVERLAY_BUTTON} bg-black/70 hover:bg-black/85`}
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear spot</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMarkingSpot((m) => !m);
              }}
              className={`${OVERLAY_BUTTON} ${markingSpot ? "bg-primary" : "bg-black/65 hover:bg-black/80"}`}
            >
              <Crosshair className="h-3.5 w-3.5" />
              <span>{markingSpot ? "Tap photo to place spot" : "Mark a spot"}</span>
            </button>
          )}
        </div>
      </div>

      <AreaPhotoThumbs photos={photos} activeId={photo.id} onSelect={setActiveId} />
    </div>
  );
}