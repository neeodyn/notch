import SnapPhotoTile from "@/components/notch/SnapPhotoTile";
import { resolvePhotoTarget } from "@/lib/photos";

export default function SnapPhotoStrip({ photos = [], targets = [], onMovePhoto }) {
  const visible = photos.filter((p) => p.url);
  if (visible.length === 0) return null;

  return (
    <section aria-labelledby="snap-photos-heading" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2
          id="snap-photos-heading"
          className="text-[19px] font-bold tracking-[-0.015em] text-foreground"
        >
          Photos ({visible.length})
        </h2>
        <p className="text-[13px] text-muted-foreground">In the order you snapped them</p>
      </div>
      <ol className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:-mx-5 sm:px-5">
        {visible.map((photo) => (
          <SnapPhotoTile
            key={photo.id}
            photo={photo}
            target={resolvePhotoTarget(photo, targets)}
            targets={targets}
            onMovePhoto={onMovePhoto}
          />
        ))}
      </ol>
    </section>
  );
}