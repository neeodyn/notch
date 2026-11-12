import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Moon, PaintRoller, Sun } from "lucide-react";
import { SAMPLE_QUOTE_TOKEN } from "@/components/sample/sampleQuoteData";

export default function LandingHeader() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("notch_theme", next ? "dark" : "light");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-7">
          <Link to="/" className="flex min-h-[44px] items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <PaintRoller className="h-4 w-4" />
            </span>
            <span className="text-[20px] font-bold tracking-[-0.025em] text-foreground">Notch</span>
            <span className="hidden rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground sm:inline-block">
              NZ
            </span>
          </Link>

          <nav className="hidden items-center gap-5 text-[14px] font-medium text-muted-foreground md:flex">
            <a href="#walkthrough" className="hover:text-foreground transition-colors">
              40s walkthrough
            </a>
            <Link
              to="/q/$token"
              params={{ token: SAMPLE_QUOTE_TOKEN }}
              className="hover:text-foreground transition-colors"
            >
              Sample Ponsonby quote
            </Link>
            <a href="#pricing" className="hover:text-foreground transition-colors">
              Pricing
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Switch colour theme"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors duration-200 hover:bg-secondary hover:text-foreground"
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <Link
            to="/login"
            className="flex min-h-[44px] items-center rounded-xl px-3.5 text-[15px] font-medium text-foreground transition-colors duration-200 hover:bg-secondary"
          >
            Sign in
          </Link>
          <Link
            to="/app"
            className="flex min-h-[44px] items-center rounded-xl bg-primary px-4 text-[15px] font-semibold text-primary-foreground transition-opacity duration-200 hover:opacity-90"
          >
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}