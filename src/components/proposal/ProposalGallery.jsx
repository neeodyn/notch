import { useState } from "react";
import { Image } from "@/components/ui/image";
import PhotoViewer from "@/components/proposal/PhotoViewer";

function areaFor(photo, items) {
  return items.find((it) => it.id === photo.item_id || (!it.is_optional_split && it.area_number === photo.area_number));
}

export default function ProposalGallery({ photos, items }) {
  const [viewerIndex, setViewerIndex] = useState(null);
  const visiblePhotos = photos.filter((photo) => photo.url);
  if (!visiblePhotos.length) return null;

  const labelFor = (photo, idx) => areaFor(photo, items)?.name || `Room ${photo.area_number || idx + 1}`;

  return (
    <section className="proposal-gallery-section">
      <div className="proposal-section-label"><span>01</span><h2>Room & elevation photos</h2></div>
      <div className="proposal-gallery">
        {visiblePhotos.map((photo, idx) => {
          const hasPin = photo.pin_x != null && photo.pin_y != null;
          const label = labelFor(photo, idx);
          return (
            <figure key={photo.id || idx} className="proposal-photo print-card">
              <Image src={photo.url} alt={label} className="h-full w-full object-cover" />
              <button type="button" onClick={() => setViewerIndex(idx)} aria-label={`View photo: ${label}`} className="no-print absolute inset-0 rounded-[inherit]" />
              <figcaption className="photo-caption glass-panel pointer-events-none">
                <span className="text-[10px] text-muted-foreground">{String(photo.area_number || idx + 1).padStart(2, "0")}</span>
                {label}
              </figcaption>
              {hasPin && (
                <span style={{ left: `${photo.pin_x * 100}%`, top: `${photo.pin_y * 100}%` }} className="pointer-events-none absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-primary-foreground bg-primary text-xs font-semibold text-primary-foreground shadow-md">
                  {photo.area_number || idx + 1}
                </span>
              )}
            </figure>
          );
        })}
      </div>
      <PhotoViewer photos={visiblePhotos} index={viewerIndex} onIndexChange={setViewerIndex} onClose={() => setViewerIndex(null)} labelFor={labelFor} />
    </section>
  );
}