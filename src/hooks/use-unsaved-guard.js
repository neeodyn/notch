import { useRef } from "react";
import { useBlocker } from "@tanstack/react-router";

/**
 * Blocks in-app navigation and tab close while `dirty` is true.
 * Call allowNavigation() right before a deliberate navigate (e.g. after saving).
 */
export function useUnsavedGuard(dirty) {
  const dirtyRef = useRef(dirty);
  const bypassRef = useRef(false);
  dirtyRef.current = dirty;

  const shouldBlock = () => dirtyRef.current && !bypassRef.current;
  const blocker = useBlocker({
    shouldBlockFn: shouldBlock,
    enableBeforeUnload: shouldBlock,
    withResolver: true,
  });

  return {
    blocker,
    allowNavigation: () => {
      bypassRef.current = true;
    },
  };
}