import { STARTER_PAINTER_PRICE_BOOK } from "@/lib/pricing";

const RATE_FIELDS = [
  { key: "walls_m2", label: "Interior walls", unit: "$ / m²" },
  { key: "ceiling_m2", label: "Ceilings", unit: "$ / m²" },
  { key: "skirting_m", label: "Skirting", unit: "$ / m" },
  { key: "door_each", label: "Doors (inc. frame)", unit: "$ / each" },
  { key: "window_each", label: "Windows", unit: "$ / each" },
  { key: "weatherboards_m2", label: "Weatherboards", unit: "$ / m²" },
  { key: "soffits_m2", label: "Soffits", unit: "$ / m²" },
  { key: "fascia_m", label: "Fascia", unit: "$ / m" },
];

export default function PriceBookEditor({ value, onChange }) {
  const book = value || null;

  function enableStarter() {
    onChange(structuredClone(STARTER_PAINTER_PRICE_BOOK));
  }

  function updateField(field, rawVal) {
    const base = book
      ? structuredClone(book)
      : structuredClone(STARTER_PAINTER_PRICE_BOOK);
    base[field] = Math.max(0, Number(rawVal) || 0);
    onChange(base);
  }

  function updatePrep(prepKey, rawVal) {
    const base = book
      ? structuredClone(book)
      : structuredClone(STARTER_PAINTER_PRICE_BOOK);
    base.prep = {
      ...(base.prep || { light: 0.85, standard: 1, heavy: 1.35 }),
      [prepKey]: Math.max(0.1, Number(rawVal) || 1),
    };
    onChange(base);
  }

  function updateCoat(coatKey, rawVal) {
    const base = book
      ? structuredClone(book)
      : structuredClone(STARTER_PAINTER_PRICE_BOOK);
    base.coats = {
      ...(base.coats || { 1: 0.7, 2: 1, 3: 1.35 }),
      [coatKey]: Math.max(0.1, Number(rawVal) || 1),
    };
    onChange(base);
  }

  if (!book) {
    return (
      <div className="apple-surface rounded-[20px] border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-lg">
            <h3 className="text-[18px] font-semibold text-foreground">
              Optional painter price book
            </h3>
            <p className="mt-1 text-[15px] leading-[1.48] text-muted-foreground">
              Skip this if you prefer speaking every room price on the walk. Enable it to auto-price rooms from L × W ×
              stud and flag spoken numbers below 0.5× or above 2× your rate card.
            </p>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-[12px] font-semibold text-muted-foreground">
            Optional
          </span>
        </div>
        <button
          type="button"
          onClick={enableStarter}
          className="mt-4 flex min-h-[48px] items-center rounded-xl bg-secondary px-4 text-[15px] font-semibold text-foreground hover:opacity-90"
        >
          Load NZ starter painter rates
        </button>
      </div>
    );
  }

  return (
    <div className="apple-surface space-y-6 rounded-[20px] border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[18px] font-semibold text-foreground">
            Painter rate card (at 2 coats, standard prep)
          </h3>
          <p className="text-[14px] text-muted-foreground">
            Large inputs—leave any rate at 0 if you price that item verbally
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="min-h-[44px] rounded-xl px-3 text-[14px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          Turn off price book
        </button>
      </div>

      {/* Large Number Inputs for Surface & Unit Rates */}
      <div className="grid gap-3 sm:grid-cols-2">
        {RATE_FIELDS.map((rf) => (
          <label
            key={rf.key}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3"
          >
            <div>
              <span className="block text-[15px] font-semibold text-foreground">
                {rf.label}
              </span>
              <span className="text-[12px] text-muted-foreground">{rf.unit}</span>
            </div>
            <input
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              value={book[rf.key] ?? 0}
              onChange={(e) => updateField(rf.key, e.target.value)}
              className="tabular-money h-14 w-28 rounded-xl border border-input bg-card px-3 text-right text-[20px] font-bold text-foreground"
            />
          </label>
        ))}
      </div>

      {/* Prep & Coats Multipliers */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="mb-3 text-[14px] font-semibold text-foreground">
            Prep multipliers
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { k: "light", label: "Light" },
              { k: "standard", label: "Standard" },
              { k: "heavy", label: "Heavy" },
            ].map(({ k, label }) => (
              <label key={k} className="block">
                <span className="text-[12px] text-muted-foreground">{label}</span>
                <input
                  type="number"
                  min="0.1"
                  max="5"
                  step="0.05"
                  inputMode="decimal"
                  value={book.prep?.[k] ?? 1}
                  onChange={(e) => updatePrep(k, e.target.value)}
                  className="tabular-money mt-1 h-12 w-full rounded-xl border border-input bg-card px-2.5 text-center text-[16px] font-semibold"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="mb-3 text-[14px] font-semibold text-foreground">
            Coat multipliers
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { k: "1", label: "1 coat" },
              { k: "2", label: "2 coats" },
              { k: "3", label: "3 coats" },
            ].map(({ k, label }) => (
              <label key={k} className="block">
                <span className="text-[12px] text-muted-foreground">{label}</span>
                <input
                  type="number"
                  min="0.1"
                  max="5"
                  step="0.05"
                  inputMode="decimal"
                  value={book.coats?.[k] ?? 1}
                  onChange={(e) => updateCoat(k, e.target.value)}
                  className="tabular-money mt-1 h-12 w-full rounded-xl border border-input bg-card px-2.5 text-center text-[16px] font-semibold"
                />
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Round To */}
      <label className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3">
        <div>
          <span className="block text-[15px] font-semibold text-foreground">
            Round calculated rooms UP to ($)
          </span>
          <span className="text-[12px] text-muted-foreground">
            e.g. $864.32 rounds up to $870 at $10 rounding
          </span>
        </div>
        <input
          type="number"
          min="1"
          step="5"
          inputMode="numeric"
          value={book.round_to ?? 10}
          onChange={(e) => updateField("round_to", e.target.value)}
          className="tabular-money h-14 w-28 rounded-xl border border-input bg-card px-3 text-right text-[20px] font-bold text-foreground"
        />
      </label>
    </div>
  );
}