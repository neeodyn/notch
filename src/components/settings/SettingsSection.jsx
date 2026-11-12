import { useId } from "react";

/** A titled group of settings. `bare` skips the card for children that bring their own. */
export default function SettingsSection({ title, description, bare = false, children }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="space-y-3">
      <div className="px-1">
        <h2 id={id} className="text-[19px] font-semibold tracking-[-0.02em] text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-[14px] leading-snug text-muted-foreground">{description}</p>}
      </div>
      {bare ? children : <div className="space-y-4 rounded-[20px] bg-card p-5">{children}</div>}
    </section>
  );
}