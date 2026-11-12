import { useEffect, useState } from "react";
import { MapPin, Phone, User } from "lucide-react";

export default function ClientDetailsCard({ quote, highlightedKeys = [], onSavePatch }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    client_name: quote.client_name || "",
    client_phone: quote.client_phone || "",
    client_email: quote.client_email || "",
    address: quote.address || "",
    deposit_pct: quote.deposit_pct ?? 0,
    notes: quote.notes || "",
  });

  useEffect(() => {
    setDraft({
      client_name: quote.client_name || "",
      client_phone: quote.client_phone || "",
      client_email: quote.client_email || "",
      address: quote.address || "",
      deposit_pct: quote.deposit_pct ?? 0,
      notes: quote.notes || "",
    });
  }, [quote]);

  const isHighlighted = highlightedKeys.some((k) => k.startsWith("quote:"));

  async function handleSave(e) {
    e.preventDefault();
    await onSavePatch({
      client_name: draft.client_name.trim(),
      client_phone: draft.client_phone.trim(),
      client_email: draft.client_email.trim(),
      address: draft.address.trim(),
      deposit_pct: Math.max(0, Math.min(100, Number(draft.deposit_pct) || 0)),
      notes: draft.notes.trim(),
    });
    setEditing(false);
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="apple-surface space-y-3 rounded-[24px] border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-semibold text-foreground">Client &amp; job details</h2>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="min-h-[44px] px-3 text-[15px] text-muted-foreground"
          >
            Cancel
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[13px] font-medium text-muted-foreground">Client name</span>
            <input
              type="text"
              value={draft.client_name}
              onChange={(e) => setDraft({ ...draft, client_name: e.target.value })}
              placeholder="Sarah Miller"
              className="mt-1 h-12 w-full rounded-xl border border-input bg-background px-3.5 text-[16px]"
            />
          </label>
          <label className="block">
            <span className="text-[13px] font-medium text-muted-foreground">Mobile phone</span>
            <input
              type="tel"
              value={draft.client_phone}
              onChange={(e) => setDraft({ ...draft, client_phone: e.target.value })}
              placeholder="021 555 0134"
              className="mt-1 h-12 w-full rounded-xl border border-input bg-background px-3.5 text-[16px]"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[13px] font-medium text-muted-foreground">Property address</span>
            <input
              type="text"
              value={draft.address}
              onChange={(e) => setDraft({ ...draft, address: e.target.value })}
              placeholder="14 Kauri Street, Ponsonby, Auckland"
              className="mt-1 h-12 w-full rounded-xl border border-input bg-background px-3.5 text-[16px]"
            />
          </label>
          <label className="block">
            <span className="text-[13px] font-medium text-muted-foreground">Client email (optional)</span>
            <input
              type="email"
              value={draft.client_email}
              onChange={(e) => setDraft({ ...draft, client_email: e.target.value })}
              placeholder="sarah@example.co.nz"
              className="mt-1 h-12 w-full rounded-xl border border-input bg-background px-3.5 text-[16px]"
            />
          </label>
          <label className="block">
            <span className="text-[13px] font-medium text-muted-foreground">Deposit (%)</span>
            <input
              type="number"
              min="0"
              max="100"
              value={draft.deposit_pct}
              onChange={(e) => setDraft({ ...draft, deposit_pct: e.target.value })}
              className="tabular-money mt-1 h-12 w-full rounded-xl border border-input bg-background px-3.5 text-[16px]"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[13px] font-medium text-muted-foreground">Site / colour notes</span>
            <textarea
              rows={2}
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              placeholder="Access lockbox, furniture sheeting, Resene or Dulux colour notes…"
              className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-[16px]"
            />
          </label>
        </div>

        <button
          type="submit"
          className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-[16px] font-semibold text-primary-foreground"
        >
          Save client details
        </button>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`apple-surface w-full rounded-[18px] border border-border bg-card p-4 text-left sm:p-5 ${
        isHighlighted ? "field-changed-glow" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[18px] font-semibold text-foreground">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{quote.client_name || "Tap to add client name"}</span>
          </div>
          <p className="flex items-center gap-2 text-[15px] text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{quote.address || "Tap to add street address"}</span>
          </p>
          {quote.client_phone && (
            <p className="flex items-center gap-2 text-[15px] text-muted-foreground">
              <Phone className="h-4 w-4 shrink-0" />
              <span>{quote.client_phone}</span>
            </p>
          )}
        </div>

        <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-[13px] font-medium text-foreground">
          {Number(quote.deposit_pct) > 0 ? `${quote.deposit_pct}% deposit` : "Edit"}
        </span>
      </div>

      {quote.notes && (
        <p className="mt-3 border-t border-border pt-2.5 text-[14px] text-muted-foreground">{quote.notes}</p>
      )}
    </button>
  );
}