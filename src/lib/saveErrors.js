/** True when a request failed because the phone had no signal, not because of the app. */
export function isConnectionError(err) {
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  return offline || /failed to fetch|load failed|networkerror|network request failed/i.test(err?.message || "");
}

/**
 * What to tell a painter when a change doesn't save. On site that is almost
 * always patchy reception, so say so plainly instead of showing a browser error.
 */
export function describeSaveError(err, fallback = "That change wasn't saved. Please try again.") {
  return isConnectionError(err)
    ? "No connection. That change wasn't saved, so try again once you have signal."
    : fallback;
}