import { HAZARD_LABELS, STARTER_PRICE_BOOK, WORK_LABELS } from "@/lib/pricing";

const WORK_KEYS = ["remove", "trim", "crown_reduce", "deadwood", "stump_grind"];
const SIZE_KEYS = ["small", "medium", "large", "xl"];
const HAZARD_KEYS = ["near_structure", "over_fence", "leaning", "dead_or_decayed", "no_truck_access"];

export default function PriceBookEditor({ value, onChange }) {
  const book = value || null;

  function enableStarter() {
    onChange(structuredClone(STARTER_PRICE_BOOK));
  }

  function updateWorkCell(work, size, rawVal) {
    const base = book ? structuredClone(book) : structuredClone(STARTER_PRICE_BOOK);
    base[work] = { ...(base[work] || {}), [size]: Math.max(0, Number(rawVal) || 0) };
    onChange(base);
  }

  function updateHazard(hazardKey, rawVal) {
    const base = book ? structuredClone(book) : structuredClone(STARTER_PRICE_BOOK);
    base.hazard_pct = { ...(base.hazard_pct || {}), [hazardKey]: Math.max(0, Number(rawVal) || 0) };
    onChange(base);
  }

  function updateTopField(field, rawVal) {
    const base = book ? structuredClone(book) : structuredClone(STARTER_PRICE_BOOK);
    base[field] = Math.max(0, Number(rawVal) || 0);
    onChange(base);
  }

  if (!book) {
    return (
      <div className="rounded-[18px] border border-border bg-card p-5">
        <h3 className="text-[18px] font-semibold text-foreground">Optional price book</h3>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Skip this if you always speak prices in the yard. Turn it on if you want automatic fallback pricing and
          warnings when a spoken number looks under half or over double your usual rate.
        </p>
        <button
          type="button"
          onClick={enableStarter}
          className="mt-4 flex min-h-[44px] items-center rounded-xl bg-secondary px-4 text-[15px] font-semibold text-foreground hover:opacity-90"
        >
          Load starter tree rates
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-[18px] border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[18px] font-semibold text-foreground">Price book rates</h3>
          <p className="text-[14px] text-muted-foreground">Base dollar rate by work and tree height</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="min-h-[44px] rounded-xl px-3 text-[14px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          Turn off price book
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px] text-left text-[14px]">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Work</th>
              <th className="px-2 py-2 font-medium">&lt;30 ft</th>
              <th className="px-2 py-2 font-medium">30–60 ft</th>
              <th className="px-2 py-2 font-medium">60–80 ft</th>
              <th className="px-2 py-2 font-medium">&gt;80 ft</th>
            </tr>
          </thead>
          <tbody>
            {WORK_KEYS.map((work) => (
              <tr key={work} className="border-b border-border/60">
                <td className="py-2.5 pr-3 font-medium text-foreground">{WORK_LABELS[work]}</td>
                {SIZE_KEYS.map((sz) => (
                  <td key={sz} className="px-1.5 py-2">
                    <input
                      type="number"
                      min="0"
                      step="25"
                      value={book[work]?.[sz] ?? 0}
                      onChange={(e) => updateWorkCell(work, sz, e.target.value)}
                      className="tabular-money h-11 w-20 rounded-xl border border-input bg-background px-2.5 text-[15px] text-foreground"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center justify-between rounded-xl border border-border bg-background px-3.5 py-2.5">
          <span className="text-[15px] text-foreground">Brush haul-away (%)</span>
          <input
            type="number"
            min="0"
            max="100"
            value={book.haul_pct ?? 15}
            onChange={(e) => updateTopField("haul_pct", e.target.value)}
            className="tabular-money h-11 w-20 rounded-xl border border-input bg-card px-2.5 text-right text-[15px]"
          />
        </label>
        <label className="flex items-center justify-between rounded-xl border border-border bg-background px-3.5 py-2.5">
          <span className="text-[15px] text-foreground">Round up to ($)</span>
          <input
            type="number"
            min="1"
            step="5"
            value={book.round_to ?? 25}
            onChange={(e) => updateTopField("round_to", e.target.value)}
            className="tabular-money h-11 w-20 rounded-xl border border-input bg-card px-2.5 text-right text-[15px]"
          />
        </label>
      </div>

      <div>
        <p className="mb-2 text-[14px] font-semibold text-muted-foreground">Hazard add-ons (%)</p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {HAZARD_KEYS.map((hk) => (
            <label
              key={hk}
              className="flex items-center justify-between rounded-xl border border-border bg-background px-3.5 py-2"
            >
              <span className="text-[14px] text-foreground">{HAZARD_LABELS[hk]}</span>
              <input
                type="number"
                min="0"
                max="200"
                value={book.hazard_pct?.[hk] ?? 0}
                onChange={(e) => updateHazard(hk, e.target.value)}
                className="tabular-money h-10 w-16 rounded-lg border border-input bg-card px-2 text-right text-[14px]"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}