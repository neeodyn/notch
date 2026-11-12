const rows = [["Ceiling", "20 m²"], ["Excl. GST", "$1,100.00"], ["GST 15%", "$165.00"], ["Incl. GST", "$1,265.00"]];

export default function MeasureVignette() {
  return (
    <div className="tabular-money pb-10">
      <p className="text-[13px] text-muted-foreground">Lounge · 5 × 4 m · stud 2.4 m</p>
      <p className="mt-2 font-display text-[72px] font-semibold leading-none tracking-[-0.055em]">38.9<span className="ml-2 text-[19px] font-medium tracking-[-0.02em] text-muted-foreground">m² of wall</span></p>
      <dl className="mt-7">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between border-t border-foreground/10 py-3 text-[15px]"><dt className="text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>
        ))}
      </dl>
    </div>
  );
}