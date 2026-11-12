import { Link } from "@tanstack/react-router";
import { PaintRoller, LayoutGrid, SlidersHorizontal, ArrowUpRight } from "lucide-react";

export default function AppNavigation() {
  return (
    <nav className="app-navigation no-print" aria-label="Main navigation">
      <Link to="/app" className="inline-flex min-h-11 items-center gap-2 text-lg font-semibold tracking-tight"><span className="brand-mark"><PaintRoller size={15} /></span>notch</Link>
      <div className="flex items-center gap-1"><Link to="/app" activeOptions={{ exact: true }} activeProps={{ className: "app-nav-active" }} className="app-nav-link"><LayoutGrid size={15} /><span>Quotes</span></Link><Link to="/app/settings" activeProps={{ className: "app-nav-active" }} className="app-nav-link"><SlidersHorizontal size={15} /><span>Settings</span></Link><Link to="/" aria-label="Open website" className="app-nav-link"><ArrowUpRight size={17} /></Link></div>
    </nav>
  );
}