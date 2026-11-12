const CHANNEL_LABEL = { sms: "Messages", email: "your email app", copy: "the copied link" };

/** Asked after a hand-off we can't confirm (text, email, copied link). */
export default function SentConfirm({ channel, clientName, marking, onConfirm, onDismiss }) {
  const who = String(clientName || "").trim().split(/\s+/)[0] || "the homeowner";
  return (
    <div className="rounded-2xl border border-border p-4" role="status">
      <p className="text-[15px] font-semibold text-foreground">Sent it with {CHANNEL_LABEL[channel] || "another app"}?</p>
      <p className="mt-0.5 text-[14px] leading-snug text-muted-foreground">
        Mark the quote as sent and you'll see when {who} opens it.
      </p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onDismiss} className="h-11 flex-1 rounded-xl bg-secondary text-[14px] font-semibold text-foreground">
          Not yet
        </button>
        <button type="button" disabled={marking} onClick={onConfirm} className="h-11 flex-[1.4] rounded-xl bg-primary text-[14px] font-semibold text-primary-foreground disabled:opacity-50">
          {marking ? "Saving…" : "Mark as sent"}
        </button>
      </div>
    </div>
  );
}