import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { formatMoney } from "@/lib/pricing";
import { formatNzDate } from "@/lib/legal";
import HomeownerAcceptForm from "@/components/notch/HomeownerAcceptForm";
import HomeownerDeclineConfirm from "@/components/notch/HomeownerDeclineConfirm";

const DOCK = "glass-dock no-print sticky bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur-md safe-bottom";

export default function HomeownerAcceptBar({
  status,
  acceptedName,
  acceptedAt,
  total,
  depositPct,
  depositAmount,
  currency = "NZD",
  businessName,
  onAccept,
  onDecline,
  submitting,
}) {
  const [mode, setMode] = useState("idle");

  if (status === "accepted") {
    return (
      <div className={DOCK}>
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" />
            <div>
              <p className="text-[16px] font-semibold text-foreground">
                Quote accepted{acceptedName ? ` by ${acceptedName}` : ""}
              </p>
              {acceptedAt && <p className="text-[13px] text-muted-foreground">Signed {formatNzDate(acceptedAt)}</p>}
            </div>
          </div>
          <span className="tabular-money text-[20px] font-bold text-foreground">{formatMoney(total, currency)}</span>
        </div>
      </div>
    );
  }

  if (status === "declined") {
    return (
      <div className={DOCK}>
        <div className="mx-auto max-w-2xl px-4 py-4 sm:px-5">
          <p className="text-[16px] font-semibold text-foreground">Quote declined</p>
          <p className="text-[13px] text-muted-foreground">
            This quote is closed. Contact {businessName || "your painter"} if you would like a revised quote.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={DOCK}>
      <div className="mx-auto max-w-2xl px-4 py-3.5 sm:px-5">
        {mode === "accept" ? (
          <HomeownerAcceptForm
            total={total}
            currency={currency}
            businessName={businessName}
            submitting={submitting}
            onCancel={() => setMode("idle")}
            onSubmit={async (payload) => {
              await onAccept(payload);
              setMode("idle");
            }}
          />
        ) : mode === "decline" ? (
          <HomeownerDeclineConfirm
            businessName={businessName}
            submitting={submitting}
            onCancel={() => setMode("idle")}
            onConfirm={async () => {
              await onDecline();
              setMode("idle");
            }}
          />
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="tabular-money text-[22px] font-bold leading-tight text-foreground">{formatMoney(total, currency)}</p>
              <p className="tabular-money text-[13px] text-muted-foreground">
                {depositPct > 0 ? `${depositPct}% deposit (${formatMoney(depositAmount, currency)})` : "Incl. GST and selected options"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              {onDecline && (
                <button type="button" disabled={submitting} onClick={() => setMode("decline")} className="min-h-[44px] rounded-xl px-2.5 text-[14px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground sm:px-3">
                  Decline
                </button>
              )}
              <button type="button" onClick={() => setMode("accept")} className="flex h-14 items-center justify-center whitespace-nowrap rounded-2xl bg-primary px-5 text-[17px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:px-6">
                Accept quote
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}