import { Image } from "@/components/ui/image";

/** One room on the review screen: its photo, number, name, measured spec and price. */
export default function ReviewArea({ number, name, chip, spec, price, was, photo, changed }) {
  return (
    <div className={`overflow-hidden rounded-[16px] bg-card ${changed ? "ring-2 ring-primary/60" : ""}`}>
      {photo && (
        <div className="relative h-[76px]">
          <Image src={photo} alt="" focalPointX={0.5} focalPointY={0.3} className="block h-full w-full object-cover" />
          <span className="absolute left-2 top-2 rounded-full bg-background/95 px-1.5 py-px text-[9px] font-semibold">Photo 1</span>
          <span className="absolute left-[52%] top-[46%] flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[1.5px] border-white bg-primary text-[9px] font-bold text-white">
            {number}
          </span>
        </div>
      )}
      <div className="flex items-start justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5">
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">{number}</span>
            <span className="text-[14px] font-semibold tracking-tight">{name}</span>
            {chip && <span className="rounded-full bg-background px-1.5 py-px text-[9px] font-medium">{chip}</span>}
          </p>
          <p className="tabular-money mt-1 text-[10px] leading-snug text-muted-foreground">{spec}</p>
        </div>
        <div className="tabular-money shrink-0 text-right">
          {was && <span className="block text-[10px] text-muted-foreground line-through">{was}</span>}
          <span className="block text-[14px] font-bold">{price}</span>
          <span className="mt-0.5 inline-block rounded-full bg-secondary px-1.5 py-px text-[9px] font-medium text-muted-foreground">Spoken</span>
        </div>
      </div>
    </div>
  );
}