import { Image } from "@/components/ui/image";

export default function AreaPhotoThumbs({ photos = [], activeId, onSelect }) {
  if (photos.length < 2) return null;
  return (
    <div className="flex gap-2 overflow-x-auto px-4 pt-3 sm:px-5">
      {photos.map((p) => {
        const active = p.id === activeId;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            aria-label={`Show photo ${p.snap_number}`}
            aria-pressed={active}
            className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-xl transition-opacity ${
              active ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : "opacity-75 hover:opacity-100"
            }`}
          >
            <Image src={p.url} alt="" className="h-full w-full object-cover" />
            <span className="tabular-money absolute bottom-1 left-1 rounded-full bg-background/95 px-1.5 text-[11px] font-semibold text-foreground">
              {p.snap_number}
            </span>
          </button>
        );
      })}
    </div>
  );
}