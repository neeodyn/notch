import { Link } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";

export default function WorkspaceHeader({ businessName }) {
  return (
    <header className="mx-auto flex max-w-2xl items-end justify-between gap-3 px-4 pb-1 pt-[calc(0.75rem_+_env(safe-area-inset-top))] sm:px-5">
      <div className="min-w-0">
        <p className="truncate text-[14px] font-medium text-muted-foreground">
          {businessName || "Your quoting workspace"}
        </p>
        <h1 className="mt-1 font-display text-[36px] font-semibold leading-none tracking-[-0.045em] sm:text-[46px]">
          Quotes
        </h1>
      </div>
      <Link
        to="/app/settings"
        aria-label="Business settings"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card text-foreground"
      >
        <SlidersHorizontal size={18} strokeWidth={1.8} />
      </Link>
    </header>
  );
}