import { AlertTriangle, Check } from "lucide-react";

export default function CheckAlertBanner({ unclear = [], items = [], onDismissUnclear }) {
  const missingPriceItems = items.filter((it) => it.price == null || it.price_source === "none");
  const flaggedItems = items.filter((it) => it.flagged);

  if (unclear.length === 0 && missingPriceItems.length === 0 && flaggedItems.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Items needing your check"
      className="rounded-[18px] border border-[hsl(var(--amber-border))] bg-[hsl(var(--amber-surface))] p-4 text-[hsl(var(--amber-ink))]"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <h2 className="text-[17px] font-semibold">Check these before sending</h2>
      </div>

      <ul className="mt-2.5 space-y-2 text-[15px]">
        {missingPriceItems.map((it) => (
          <li key={`missing-${it.id}`} className="flex items-center justify-between gap-2">
            <span>
              <strong>{it.label || `Tree ${it.tree_number}`}</strong> needs your price.
            </span>
            <a
              href={`#tree-card-${it.id}`}
              className="flex min-h-[44px] shrink-0 items-center rounded-xl px-3 text-[14px] font-semibold underline"
            >
              Set price
            </a>
          </li>
        ))}

        {flaggedItems.map((it) => (
          <li key={`flag-${it.id}`} className="flex items-center justify-between gap-2">
            <span>
              <strong>{it.label || `Tree ${it.tree_number}`}</strong> spoken price (${it.price}) is far from price book
              (${it.price_book_estimate}).
            </span>
            <a
              href={`#tree-card-${it.id}`}
              className="flex min-h-[44px] shrink-0 items-center rounded-xl px-3 text-[14px] font-semibold underline"
            >
              Review
            </a>
          </li>
        ))}

        {unclear.map((note, idx) => (
          <li key={`unclear-${idx}`} className="flex items-center justify-between gap-2">
            <span>{note}</span>
            {onDismissUnclear && (
              <button
                type="button"
                onClick={() => onDismissUnclear(idx)}
                className="flex min-h-[44px] shrink-0 items-center gap-1 rounded-xl px-3 text-[14px] font-semibold hover:bg-black/5"
              >
                <Check className="h-4 w-4" />
                <span>OK</span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}