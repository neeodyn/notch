export default function LegalSection({ index, heading, body = [], list = [] }) {
  return (
    <li className="grid gap-3 border-b border-border py-8 sm:grid-cols-[56px_1fr]">
      <span className="tabular-money pt-1 text-[13px] font-semibold text-muted-foreground">
        {String(index).padStart(2, "0")}
      </span>
      <div>
        <h2 className="font-display text-[21px] font-semibold leading-tight tracking-[-0.025em] text-foreground">
          {heading}
        </h2>
        <div className="mt-3 space-y-3 text-[16px] leading-[1.6] text-muted-foreground">
          {body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        {list.length > 0 && (
          <ul className="mt-3 space-y-2.5 text-[16px] leading-[1.55] text-muted-foreground">
            {list.map((entry) => (
              <li key={entry} className="flex gap-3">
                <span aria-hidden="true" className="mt-[11px] h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
                <span>{entry}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}