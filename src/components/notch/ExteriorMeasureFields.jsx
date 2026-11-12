const FIELDS = [
  { key: "area_m2_spoken", label: "Weatherboards / walls (m²)" },
  { key: "soffits_m2", label: "Soffits (m²)" },
  { key: "fascia_m", label: "Fascia (metres)" },
];

export default function ExteriorMeasureFields({ item, onUpdateItem }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-3">
      {FIELDS.map((field) => (
        <label key={field.key} className="block">
          <span className="text-[12px] font-medium text-muted-foreground">{field.label}</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            defaultValue={item[field.key] ?? ""}
            placeholder="Not measured"
            onBlur={(e) =>
              onUpdateItem(item.id, {
                [field.key]: e.target.value === "" ? null : Math.max(0, Number(e.target.value)),
              })
            }
            className="tabular-money mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-[15px]"
          />
        </label>
      ))}
    </div>
  );
}