import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { formatMoney } from "@/lib/pricing";

export default function HomeownerAcceptBar({
  status,
  acceptedName,
  acceptedAt,
  total,
  depositPct,
  depositAmount,
  currency = "NZD",
  onAccept,
  onDecline,
  submitting,
}) {
  const [openForm, setOpenForm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [agreed, setAgreed] = useState(false);

  if (status === "accepted") {
    const signedDate = acceptedAt
      ? new Date(acceptedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        })
      : "";
    return (
      <div className="glass-dock no-print sticky bottom-0 border-t border-border bg-card/95 backdrop-blur-md safe-bottom">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-[16px] font-semibold text-foreground">
                Quote accepted{acceptedName ? ` by ${acceptedName}` : ""}
              </p>
              {signedDate && <p className="text-[13px] text-muted-foreground">Signed {signedDate}</p>}
            </div>
          </div>
          <span className="tabular-money text-[20px] font-bold text-foreground">{formatMoney(total, currency)}</span>
        </div>
      </div>
    );
  }

  if (status === "declined") {
    return (
      <div className="glass-dock no-print sticky bottom-0 border-t border-border bg-card/95 backdrop-blur-md safe-bottom">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4 sm:px-5">
          <p className="text-[16px] font-semibold text-destructive">Quote declined</p>
          <button
            type="button"
            onClick={() => setOpenForm(true)}
            className="min-h-[44px] rounded-xl bg-secondary px-4 text-[14px] font-semibold text-foreground"
          >
            Reopen to accept
          </button>
        </div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (fullName.trim().length < 2 || !agreed) return;
    await onAccept({ acceptedName: fullName.trim(), agreed: true });
    setOpenForm(false);
  }

  return (
    <div className="glass-dock no-print sticky bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur-md safe-bottom">
      <div className="mx-auto max-w-2xl px-4 py-3.5 sm:px-5">
        {openForm ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] text-muted-foreground">Selected total</p>
                <p className="tabular-money text-[22px] font-bold text-foreground">{formatMoney(total, currency)}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpenForm(false)}
                className="min-h-[44px] px-3 text-[15px] text-muted-foreground"
              >
                Cancel
              </button>
            </div>

            <label className="block">
              <span className="text-[14px] font-medium text-foreground">Type your full name</span>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Sarah Miller"
                className="mt-1 h-12 w-full rounded-xl border border-input bg-background px-3.5 text-[16px]"
              />
            </label>

            <label className="flex min-h-[44px] cursor-pointer items-start gap-3 py-1 text-[15px] text-foreground">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 accent-[hsl(var(--primary))]"
              />
              <span>I approve the selected painting scope (incl. GST) and agree to the terms on this quote.</span>
            </label>

            <button
              type="submit"
              disabled={submitting || fullName.trim().length < 2 || !agreed}
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-[17px] font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
            >
              {submitting ? "Signing quote…" : `Accept quote · ${formatMoney(total, currency)}`}
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="tabular-money text-[22px] font-bold leading-tight text-foreground">
                {formatMoney(total, currency)}
              </p>
              <p className="tabular-money text-[13px] text-muted-foreground">
                {depositPct > 0 ? `${depositPct}% deposit (${formatMoney(depositAmount, currency)})` : "Total includes selected items"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {onDecline && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={onDecline}
                  className="min-h-[44px] rounded-xl px-3 text-[14px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  Decline
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpenForm(true)}
                className="flex h-14 items-center justify-center rounded-2xl bg-primary px-6 text-[17px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Accept quote
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}