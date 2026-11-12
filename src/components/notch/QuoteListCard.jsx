import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, MessageSquare } from "lucide-react";
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

export default function QuoteListCard({ quote, currency = "USD", nowMs, onFollowUp }) {
  const [loadingSms, setLoadingSms] = useState(false);
  const showFollowUp = nowMs ? isEligibleForFollowUp(quote, nowMs) : false;

  const formattedDate = quote.created_date
    ? new Date(quote.created_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })
    : "";

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
      toast.success("Follow-up message ready");
      window.location.href = smsHref;
    } catch (err) {
      toast.error(err?.message || "Could not draft follow-up message");
    } finally {
      setLoadingSms(false);
    }
  }

  return (
    <div className="rounded-[18px] border border-border bg-card transition-colors duration-200 hover:border-primary/40">
      <Link
        to="/app/q/$id/check"
        params={{ id: quote.id }}
        className="flex items-center justify-between gap-3 p-4 sm:px-5"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-[17px] font-semibold text-foreground">
              {quote.client_name || "Untitled yard quote"}
            </p>
            <StatusPill status={quote.status} />
          </div>
          <p className="mt-0.5 truncate text-[15px] text-muted-foreground">
            {quote.address || "Tap to review client details and trees"}
          </p>
          {formattedDate && <p className="mt-1 text-[13px] text-muted-foreground">{formattedDate}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="tabular-money text-[18px] font-bold text-foreground">
            {Number(quote.total) > 0 ? formatMoney(quote.total, currency) : "—"}
          </span>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </Link>

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