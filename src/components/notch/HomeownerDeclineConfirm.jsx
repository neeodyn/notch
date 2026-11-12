export default function HomeownerDeclineConfirm({ businessName, submitting, onCancel, onConfirm }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[16px] font-semibold text-foreground">Decline this quote?</p>
        <p className="text-[13px] leading-snug text-muted-foreground">
          {businessName || "Your painter"} will see that you've declined. This closes the quote and can't be undone.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-secondary text-[15px] font-semibold text-foreground"
        >
          Keep quote
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={onConfirm}
          className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-foreground text-[15px] font-semibold text-background disabled:opacity-50"
        >
          {submitting ? "Declining…" : "Yes, decline"}
        </button>
      </div>
    </div>
  );
}