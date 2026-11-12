import { Link } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";

export default function WorkspaceHeader({ businessName }) {
  return (
    <header className="workspace-header">
      <div><p className="text-[15px] font-medium text-muted-foreground">{businessName || "Your quoting workspace"}</p><h1 className="mt-1 font-display text-[44px] font-semibold leading-none tracking-[-0.05em] sm:text-[56px]">Quotes</h1></div>
      <Link to="/app/settings" aria-label="Business settings" className="workspace-settings"><SlidersHorizontal size={18} strokeWidth={1.8} /></Link>
    </header>
  );
}