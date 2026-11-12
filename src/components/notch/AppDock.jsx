import { useKeyboardOpen } from "@/hooks/use-keyboard-open";

/**
 * The screen's bottom action bar. It sits in the page flow (so nothing is ever
 * hidden behind it) and sticks to the bottom edge, clear of the home
 * indicator. While the keyboard is open it drops back to the end of the page,
 * so it never floats over the keyboard or the field being typed in.
 * Place it as the last child of a `flex min-h-dvh flex-col` screen.
 */
export default function AppDock({ children, className = "px-4 py-3 sm:px-5" }) {
  const keyboardOpen = useKeyboardOpen();
  return (
    <div
      className={`glass-dock no-print z-30 mt-auto border-t border-border safe-bottom ${
        keyboardOpen ? "relative" : "sticky bottom-0"
      }`}
    >
      <div className={`mx-auto flex max-w-2xl items-center gap-3 ${className}`}>{children}</div>
    </div>
  );
}