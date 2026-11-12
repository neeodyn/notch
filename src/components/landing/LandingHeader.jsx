import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Moon, PaintRoller, Sun, Menu, X } from "lucide-react";
import StartLink from "@/components/landing/StartLink";
import { SAMPLE_QUOTE_TOKEN } from "@/components/sample/sampleQuoteData";
import { useAuth } from "@/lib/AuthContext";

export default function LandingHeader() {
  const { isAuthenticated } = useAuth();
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
        <Link to="/" className="flex min-h-11 items-center gap-2.5 text-[19px] font-semibold tracking-[-0.03em]"><span className="brand-mark"><PaintRoller size={15} /></span>notch</Link>
        <nav aria-label="Website navigation" className="hidden items-center gap-8 text-[13px] text-foreground/80 md:flex"><a href="#how-it-works" className="hover:text-foreground">How it works</a><Link to="/q/$token" params={{ token: SAMPLE_QUOTE_TOKEN }} className="hover:text-foreground">Sample quote</Link><a href="#pricing" className="hover:text-foreground">Pricing</a></nav>
        <div className="flex items-center gap-1 sm:gap-2"><button type="button" onClick={toggleTheme} aria-label={dark ? "Use light theme" : "Use dark theme"} className="nav-icon">{dark ? <Sun size={16} /> : <Moon size={16} />}</button>{!isAuthenticated && <Link to="/login" search={{ returnTo: "/app" }} className="hidden min-h-11 items-center px-3 text-[13px] text-foreground/80 hover:text-foreground sm:flex">Sign in</Link>}<StartLink className="nav-cta" signedInLabel="My quotes">Start free</StartLink><button type="button" className="nav-icon md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={18} /> : <Menu size={18} />}</button></div>
      </div>
      {open && <nav aria-label="Mobile navigation" className="mobile-nav glass-panel"><a href="#how-it-works" onClick={() => setOpen(false)}>How it works</a><Link to="/q/$token" params={{ token: SAMPLE_QUOTE_TOKEN }} onClick={() => setOpen(false)}>Sample quote</Link><a href="#pricing" onClick={() => setOpen(false)}>Pricing</a>{!isAuthenticated && <Link to="/login" search={{ returnTo: "/app" }} onClick={() => setOpen(false)}>Sign in</Link>}</nav>}
    </header>
  );
}