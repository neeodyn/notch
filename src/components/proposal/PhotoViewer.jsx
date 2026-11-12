import { useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { Image } from "@/components/ui/image";

const CONTROL = "photo-viewer-control flex h-11 w-11 shrink-0 items-center justify-center rounded-full";

/**
 * Full-screen photo viewer: swipe or arrow keys to move, double-tap or Z to
 * zoom (drag to pan while zoomed), Escape or ✕ to close. Closing returns focus
 * to the photo that opened it, so the page stays where it was.
 */
export default function PhotoViewer({ photos, index, onIndexChange, onClose, labelFor }) {
  const [zoomed, setZoomed] = useState(false);
  const touchX = useRef(null);
  const count = photos.length;
  const photo = index != null ? photos[index] : null;
  const label = photo ? labelFor(photo, index) : "";

  useEffect(() => setZoomed(false), [index]);

  const go = (delta) => count > 1 && onIndexChange((index + delta + count) % count);

  function handleKeyDown(e) {
    if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
    else if (e.key === "z" || e.key === "Z") setZoomed((z) => !z);
  }

  function handleTouchEnd(e) {
    const start = touchX.current;
    touchX.current = null;
    if (zoomed || start == null) return;
    const dx = e.changedTouches[0].clientX - start;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  }

  return (
    <DialogPrimitive.Root open={photo != null} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content onKeyDown={handleKeyDown} className="photo-viewer fixed inset-0 z-50 flex flex-col outline-none">
          <div className="flex items-center gap-2 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="min-w-0 flex-1 pl-2">
              <DialogPrimitive.Title className="truncate text-[17px] font-semibold tracking-[-0.02em]">{label}</DialogPrimitive.Title>
              <DialogPrimitive.Description className="tabular-money text-[13px] opacity-60" aria-live="polite">
                Photo {index != null ? index + 1 : 0} of {count}
              </DialogPrimitive.Description>
            </div>
            <button type="button" onClick={() => setZoomed((z) => !z)} aria-pressed={zoomed} aria-label={zoomed ? "Zoom out" : "Zoom in"} className={CONTROL}>
              {zoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
            </button>
            <DialogPrimitive.Close aria-label="Close photo" className={CONTROL}>
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          <div
            className={`relative min-h-0 flex-1 ${zoomed ? "overflow-auto" : "flex items-center justify-center overflow-hidden px-2"}`}
            onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
            onTouchEnd={handleTouchEnd}
            onDoubleClick={() => setZoomed((z) => !z)}
          >
            {photo && (
              <Image
                key={photo.id || index}
                src={photo.url}
                alt={label}
                fittingType="fit"
                className={zoomed ? "h-auto w-[200%] max-w-none" : "max-h-full max-w-full rounded-2xl object-contain"}
              />
            )}
          </div>

          <div className="flex items-center justify-between gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <button type="button" onClick={() => go(-1)} disabled={count < 2} aria-label="Previous photo" className={`${CONTROL} h-12 w-12 disabled:opacity-30`}>
              <ChevronLeft className="h-6 w-6" />
            </button>
            <p className="text-center text-[13px] opacity-60">{zoomed ? "Drag to look around" : count > 1 ? "Swipe for more" : "Double-tap to zoom"}</p>
            <button type="button" onClick={() => go(1)} disabled={count < 2} aria-label="Next photo" className={`${CONTROL} h-12 w-12 disabled:opacity-30`}>
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}