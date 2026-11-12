import { Image } from "@/components/ui/image";
import PhotoMoveMenu from "@/components/notch/PhotoMoveMenu";

export default function SnapPhotoTile({ photo, target, targets, onMovePhoto }) {
  return (
    <li className="w-44 shrink-0 snap-start">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-card">
        <Image
          src={photo.url}
          alt={`Photo ${photo.snap_number}${target ? `, ${target.name}` : ""}`}
          className="h-full w-full object-cover"
        />
        <span className="tabular-money absolute left-2 top-2 flex h-7 min-w-[28px] items-center justify-center rounded-full bg-background px-2 text-[13px] font-semibold text-foreground">
          {photo.snap_number}
        </span>
      </div>
      <p className="mt-2 truncate text-[14px] font-semibold text-foreground">
        {target ? `${target.areaNumber} · ${target.name}` : "Not in an area yet"}
      </p>
      <div className="mt-1.5">
        <PhotoMoveMenu
          photo={photo}
          targets={targets}
          currentItemId={target?.itemId}
          onMove={onMovePhoto}
        />
      </div>
    </li>
  );
}