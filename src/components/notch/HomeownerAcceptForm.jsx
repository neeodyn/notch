import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { formatMoney } from "@/lib/pricing";

export default function HomeownerAcceptForm({ total, currency, businessName, submitting, onCancel, onSubmit }) {
  const [fullName, setFullName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const ready = fullName.trim().length >= 2 && agreed;
  const painter = businessName || "your painter";

  function handleSubmit(e) {
    e.preventDefault();
    if (ready) onSubmit({ acceptedName: fullName.trim(), agreed: true });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[16px] font-semibold">Accept {formatMoney(total, currency)} incl. GST</p>
        <button type="button" onClick={onCancel} className="min-h-[44px] px-2 text-[14px] font-medium text-muted-foreground hover:text-foreground">Cancel</button>
      </div>
      <input
        type="text"
        autoComplete="name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Type your full name"
        aria-label="Your full name"
        className="h-12 w-full rounded-xl border border-input bg-background px-3.5 text-[16px]"
      />
      <label className="flex items-start gap-3 text-[13px] leading-snug text-foreground">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-primary" />
        <span>
          I own this property, or I'm authorised by the owner to approve this work. I accept this quote for {formatMoney(total, currency)} incl. GST, with the options I've selected, and its terms. I agree that typing my name is my electronic signature.
        </span>
      </label>
      <button
        type="submit"
        disabled={!ready || submitting}
        className="flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-[17px] font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
      >
        {submitting ? "Recording acceptance…" : "Accept quote"}
      </button>
      <p className="text-[12px] leading-snug text-muted-foreground">
        Accepting forms an agreement with {painter}. Your name, the date and time, your IP address and device are recorded with your acceptance.{" "}
        <Link to="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</Link>
      </p>
    </form>
  );
}