/**
 * Hands the homeowner link to the phone's share sheet, or copies it where there
 * isn't one. Call it straight from a tap, before any await: iOS only opens the
 * share sheet (and allows copying) while it is still handling that tap.
 *
 * Resolves "shared", "copied", "dismissed" (share sheet closed without sending)
 * or "failed".
 */
export async function shareQuoteLink({ url, title, text }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return "shared";
    } catch (err) {
      if (err?.name === "AbortError") return "dismissed";
    }
  }
  const copied = await navigator.clipboard?.writeText(url).then(
    () => true,
    () => false,
  );
  return copied ? "copied" : "failed";
}