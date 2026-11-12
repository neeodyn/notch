import { AlertTriangle } from "lucide-react";

const SOURCE_LABELS = {
  spoken: "Spoken",
  price_book: "Price book",
  owner: "Edited",
  none: "Needs your price",
};

export default function PriceSourceBadge({ source = "none", flagged = false }) {
  if (source === "none") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--amber-border))] bg-[hsl(var(--amber-surface))] px-2.5 py-0.5 text-[12px] font-semibold text-[hsl(var(--amber-ink))]">
        <AlertTriangle className="h-3 w-3" />
        <span>Needs your price</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-[12px] font-medium text-muted-foreground">
        {SOURCE_LABELS[source] || "Spoken"}
      </span>
      {flagged && (
        <span className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--amber-border))] bg-[hsl(var(--amber-surface))] px-2.5 py-0.5 text-[12px] font-semibold text-[hsl(var(--amber-ink))]">
          <AlertTriangle className="h-3 w-3" />
          <span>Check price</span>
        </span>
      )}
    </span>
  );
}