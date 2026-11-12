import { useEffect } from "react";

/**
 * Keeps the phone's screen on while `active`, on browsers that support it.
 * Where it isn't supported or allowed, nothing changes.
 */
export function useScreenWakeLock(active) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return undefined;
    let lock = null;
    let cancelled = false;

    async function acquire() {
      if (document.visibilityState !== "visible" || (lock && !lock.released)) return;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (cancelled) next.release().catch(() => {});
        else lock = next;
      } catch {
        // Refused (low battery, power saving): carry on without it.
      }
    }

    // The browser drops the lock whenever the page is hidden, so take it again on return.
    document.addEventListener("visibilitychange", acquire);
    acquire();

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", acquire);
      lock?.release().catch(() => {});
    };
  }, [active]);
}