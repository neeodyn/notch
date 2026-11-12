import { useEffect, useState } from "react";

const EDITABLE = "input:not([type=checkbox]):not([type=radio]):not([type=file]), textarea, select, [contenteditable='true']";

/**
 * True while an on-screen keyboard covers part of the screen: a text field
 * has focus and the visual viewport has shrunk at normal zoom. Bottom bars use
 * it to drop back into the page instead of floating over the keyboard.
 */
export function useKeyboardOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;
    let timer = null;
    const update = () => {
      const editing = Boolean(document.activeElement?.matches?.(EDITABLE));
      const shrunk = window.innerHeight - viewport.height > 120;
      setOpen(editing && shrunk && viewport.scale < 1.05);
    };
    const updateSoon = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(update, 60);
    };
    viewport.addEventListener("resize", update);
    document.addEventListener("focusin", updateSoon);
    document.addEventListener("focusout", updateSoon);
    return () => {
      window.clearTimeout(timer);
      viewport.removeEventListener("resize", update);
      document.removeEventListener("focusin", updateSoon);
      document.removeEventListener("focusout", updateSoon);
    };
  }, []);

  return open;
}