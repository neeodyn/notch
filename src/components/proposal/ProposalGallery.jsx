import { Image } from "@/components/ui/image";

export default function ProposalGallery({ photos, items }) {
  const visiblePhotos = photos.filter((photo) => photo.url);
  if (!visiblePhotos.length) return null;
  return (
    <section className="proposal-gallery-section">
      <div className="proposal-section-label"><span>01</span><h2>Room & elevation photos</h2></div>
      <div className="proposal-gallery">
        {visiblePhotos.map((photo, idx) => {
          const hasPin = photo.pin_x != null && photo.pin_y != null;
          const areaItem = items.find((it) => it.id === photo.item_id || (!it.is_optional_split && it.area_number === photo.area_number));
          return <figure key={photo.id || idx} className="proposal-photo print-card"><Image src={photo.url} alt={areaItem?.name || `Area ${photo.area_number || idx + 1}`} className="h-full w-full object-cover" /><figcaption className="photo-caption glass-panel"><span className="text-[10px] text-muted-foreground">{String(photo.area_number || idx + 1).padStart(2, "0")}</span>{areaItem?.name || `Room ${photo.area_number || idx + 1}`}</figcaption>{hasPin && <span style={{ left: `${photo.pin_x * 100}%`, top: `${photo.pin_y * 100}%` }} className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-primary-foreground bg-primary text-xs font-semibold text-primary-foreground shadow-md">{photo.area_number || idx + 1}</span>}</figure>;
        })}
      </div>
    </section>
  );
}