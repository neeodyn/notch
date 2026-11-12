import { Link } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";

export default function WorkspaceHeader({ businessName }) {
  return (
    <header className="workspace-header">
      <div><p className="eyebrow">{businessName || "YOUR QUOTING WORKSPACE"}</p><h1 className="mt-2 font-display text-[42px] font-semibold leading-tight tracking-[-0.055em] sm:text-[50px]">Quotes<span className="text-primary">.</span></h1><p className="mt-2 text-sm text-muted-foreground">Great work starts with a clear plan.</p></div>
      <Link to="/app/settings" aria-label="Business settings" className="workspace-settings glass-panel"><SlidersHorizontal size={19} strokeWidth={1.6} /></Link>
    </header>
  );
}