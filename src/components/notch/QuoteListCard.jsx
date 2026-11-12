import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Link2, MessageSquare, FileText } from "lucide-react";
import { toast } from "sonner";
import StatusPill from "@/components/notch/StatusPill";
import { formatMoney } from "@/lib/pricing";

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

export function isEligibleForFollowUp(quote, nowMs) {
  if (!quote || quote.status !== "viewed" || quote.accepted_at) return false;
  if (!quote.viewed_at) return false;
  const viewedMs = Date.parse(quote.viewed_at);
  if (!Number.isFinite(viewedMs)) return false;
  return nowMs - viewedMs >= FORTY_EIGHT_HOURS_MS;
}

export default function QuoteListCard({ quote, currency = "NZD", nowMs, onFollowUp }) {
  const [loadingSms, setLoadingSms] = useState(false);
  const showFollowUp = nowMs ? isEligibleForFollowUp(quote, nowMs) : false;

  const formattedDate = quote.created_date
    ? new Date(quote.created_date).toLocaleDateString("en-NZ", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      })
    : "";

  const displayTotal = Number(quote.total_incl_gst ?? quote.total) || 0;

  async function handleCopyLink() {
    const shareUrl = `${window.location.origin}/q/${quote.public_token}`;
    if (navigator.clipboard?.writeText) {
      const ok = await navigator.clipboard
        .writeText(shareUrl)
        .then(() => true)
        .catch(() => false);
      toast.success(ok ? "Homeowner quote link copied" : shareUrl);
    }
  }

  async function handleFollowUp() {
    if (!onFollowUp || loadingSms) return;
    setLoadingSms(true);
    try {
      const { smsBody, clientPhone } = await onFollowUp(quote.id);
      const cleanDigits = String(clientPhone || "").replace(/[^\d+]/g, "");
      const smsHref = `sms:${cleanDigits}?&body=${encodeURIComponent(smsBody)}`;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(smsBody).catch(() => {});
      }
      toast.success("Follow-up text ready");
      window.location.href = smsHref;
    } catch (err) {
      toast.error(err?.message || "Could not draft follow-up message");
    } finally {
      setLoadingSms(false);
    }
  }

  return (
    <div className="apple-surface rounded-[18px] border border-border bg-card">
      <div className="flex items-center justify-between gap-2 p-4 sm:px-5">
        <Link
          to="/app/q/$id/check"
          params={{ id: quote.id }}
          className="flex min-w-0 flex-1 items-center justify-between gap-3"
        >
          <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-background text-foreground sm:flex"><FileText size={20} strokeWidth={1.4} /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-[17px] font-semibold text-foreground">
                {quote.client_name || "Untitled painting quote"}
              </p>
              <StatusPill status={quote.status} />
            </div>
            <p className="mt-0.5 truncate text-[15px] text-muted-foreground">
              {quote.address || "Tap to review rooms, m², and prices"}
            </p>
            {formattedDate && (
              <p className="mt-1 text-[13px] text-muted-foreground">{formattedDate}</p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <div className="text-right">
              <span className="tabular-money block text-[18px] font-bold text-foreground">
                {displayTotal > 0 ? formatMoney(displayTotal, currency) : "—"}
              </span>
              {displayTotal > 0 && (
                <span className="text-[11px] text-muted-foreground">incl. GST</span>
              )}
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Link>

        {quote.public_token && quote.status !== "draft" && (
          <button
            type="button"
            onClick={handleCopyLink}
            aria-label="Copy homeowner quote link"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground hover:text-foreground"
          >
            <Link2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {showFollowUp && (
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 sm:px-5">
          <span className="text-[13px] text-muted-foreground">Viewed over 48 hours ago</span>
          <button
            type="button"
            disabled={loadingSms}
            onClick={handleFollowUp}
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-secondary px-3.5 text-[14px] font-semibold text-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <MessageSquare className="h-4 w-4" />
            <span>{loadingSms ? "Writing text…" : "Follow up"}</span>
          </button>
        </div>
      )}
    </div>
  );
}