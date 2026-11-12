/** Labelled input with an optional hint, replaced by the error when there is one. */
export default function TextField({ id, label, hint, error, className = "", inputClassName = "", ...inputProps }) {
  const note = error || hint;
  return (
    <div className={className}>
      <label htmlFor={id} className="text-[14px] font-medium text-muted-foreground">{label}</label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={note ? `${id}-note` : undefined}
        className={`mt-1 h-12 w-full rounded-xl border bg-background px-3.5 text-[16px] ${error ? "border-destructive" : "border-input"} ${inputClassName}`}
        {...inputProps}
      />
      {note && (
        <p id={`${id}-note`} className={`mt-1.5 text-[12px] leading-snug ${error ? "font-medium text-destructive" : "text-muted-foreground"}`}>
          {note}
        </p>
      )}
    </div>
  );
}