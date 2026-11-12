import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Moon, PaintRoller, Sun, Menu, X, ArrowUpRight } from "lucide-react";
import { SAMPLE_QUOTE_TOKEN } from "@/components/sample/sampleQuoteData";

export default function LandingHeader() {
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => { setDark(document.documentElement.classList.contains("dark")); }, []);
  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("notch_theme", next ? "dark" : "light");
  }
  return (
    <header className="premium-header">
      <div className="premium-nav glass-panel">
        <Link to="/" className="flex min-h-11 items-center gap-2.5 text-xl font-semibold tracking-tight"><span className="brand-mark"><PaintRoller size={16} /></span>notch<span className="ml-1 text-[10px] font-medium text-muted-foreground">NZ</span></Link>
        <nav aria-label="Website navigation" className="hidden items-center gap-7 text-[13px] font-medium text-muted-foreground md:flex"><a href="#how-it-works" className="hover:text-foreground">The experience</a><Link to="/q/$token" params={{ token: SAMPLE_QUOTE_TOKEN }} className="hover:text-foreground">Sample quote</Link><a href="#pricing" className="hover:text-foreground">Pricing</a></nav>
        <div className="flex items-center gap-1 sm:gap-2"><button type="button" onClick={toggleTheme} aria-label={dark ? "Use light theme" : "Use dark theme"} className="nav-icon">{dark ? <Sun size={17} /> : <Moon size={17} />}</button><Link to="/login" className="hidden min-h-11 items-center px-3 text-[13px] font-medium sm:flex">Sign in</Link><Link to="/app" className="nav-cta">Start free <ArrowUpRight size={14} /></Link><button type="button" className="nav-icon md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={19} /> : <Menu size={19} />}</button></div>
      </div>
      {open && <nav aria-label="Mobile navigation" className="mobile-nav glass-panel"><a href="#how-it-works" onClick={() => setOpen(false)}>The experience</a><Link to="/q/$token" params={{ token: SAMPLE_QUOTE_TOKEN }} onClick={() => setOpen(false)}>Sample quote</Link><a href="#pricing" onClick={() => setOpen(false)}>Pricing</a><Link to="/login" onClick={() => setOpen(false)}>Sign in</Link></nav>}
    </header>
  );
}