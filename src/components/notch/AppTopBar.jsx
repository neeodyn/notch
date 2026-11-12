import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

const ICON_BUTTON =
  "flex h-11 w-11 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-secondary disabled:opacity-40";

/**
 * Sticky app bar: back to the parent screen, the screen title, and any actions.
 */
export default function AppTopBar({
  title,
  backTo = "/app",
  backLabel = "Quotes",
  actions,
}) {
  return (
    <header className="no-print sticky top-0 z-30 border-b border-border/70 bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-2xl items-center gap-1 px-2 sm:px-4">
        <Link
          to={backTo}
          className="-ml-1 flex min-h-11 shrink-0 items-center gap-0.5 rounded-xl pl-1 pr-2 text-[15px] font-medium text-primary transition-colors hover:bg-secondary"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
          <span>{backLabel}</span>
        </Link>
        <h1 className="min-w-0 flex-1 truncate px-1 text-[17px] font-semibold tracking-[-0.02em] text-foreground">
          {title}
        </h1>
        <div className="flex shrink-0 items-center gap-0.5">{actions}</div>
      </div>
    </header>
  );
}

export function TopBarIcon({ to, params, onClick, label, children }) {
  if (to) {
    return (
      <Link to={to} params={params} aria-label={label} title={label} className={ICON_BUTTON}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={ICON_BUTTON}
    >
      {children}
    </button>
  );
}