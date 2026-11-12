/**
 * Floating action bar pinned to the bottom of the screen, clear of the iPhone
 * home indicator. Screens using it add bottom padding to their content so
 * nothing ever hides behind it.
 */
export default function AppDock({ children, className = "px-4 py-3 sm:px-5" }) {
  return (
    <div className="glass-dock no-print fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 backdrop-blur-xl safe-bottom">
      <div className={`mx-auto flex max-w-2xl items-center gap-3 ${className}`}>
        {children}
      </div>
    </div>
  );
}