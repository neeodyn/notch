import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Moon, Sun, TreePine } from "lucide-react";

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
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-5">
        <Link to="/" className="flex min-h-[44px] items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <TreePine className="h-5 w-5" />
          </span>
          <span className="text-[20px] font-bold tracking-[-0.02em] text-foreground">Notch</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Switch color theme"
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