import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import BottomSheet from "@/components/notch/BottomSheet";
import ChangeInput from "@/components/notch/change/ChangeInput";
import ChangeReview from "@/components/notch/change/ChangeReview";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { calculateQuoteTotals } from "@/lib/pricing";
import { pricingSettingsFor, simulateEditChanges } from "@/lib/quote-edits";

function previewTotals({ quote, items, business, chosen }) {
  const base = {
    tickedOptionalIds: quote.selected_optional_ids || [],
    minCharge: business?.min_charge || 0,
    gstRate: business?.gst_rate ?? 0.15,
    pricesIncludeGst: Boolean(business?.prices_include_gst),
  };
  const before = calculateQuoteTotals({ ...base, items, depositPct: quote.deposit_pct || 0 }).totalInclGst;
  try {
    const sim = simulateEditChanges({ items, changes: chosen, priceBook: business?.price_book || null, settings: pricingSettingsFor(business) });
    const after = calculateQuoteTotals({ ...base, items: sim.items, depositPct: sim.quotePatch.deposit_pct ?? quote.deposit_pct ?? 0 });
    return { before, after: after.totalInclGst };
  } catch {
    return { before, after: null };
  }
}

/**
 * Speak or type a change → see exactly what will change → apply only what's
 * ticked. A single, clear, non-destructive change applies straight away.
 */
export default function QuoteChangeSheet({ open, onOpenChange, quote, items, business, currency, onPropose, onApply }) {
  const recorder = useVoiceRecorder();
  const { cancel } = recorder;
  const [step, setStep] = useState("input");
  const [busyLabel, setBusyLabel] = useState("");
  const [typed, setTyped] = useState("");
  const [proposal, setProposal] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) return;
    cancel();
    setStep("input");
    setProposal(null);
    setTyped("");
    setError("");
  }, [open, cancel]);

  const chosen = useMemo(() => (proposal?.changes || []).filter((c) => selected.has(c.id)), [proposal, selected]);
  const preview = useMemo(
    () => (proposal ? previewTotals({ quote, items, business, chosen }) : null),
    [proposal, quote, items, business, chosen]
  );

  function showReview(prop, ids) {
    setProposal(prop);
    setSelected(new Set(ids));
    setStep("review");
  }

  async function apply(prop, changes) {
    setError("");
    setBusyLabel("Updating the quote");
    setStep("busy");
    try {
      await onApply({ transcript: prop.transcript, changes });
      onOpenChange(false);
    } catch (err) {
      setError(err?.message || "Couldn't apply that change.");
      showReview(prop, changes.map((c) => c.id));
    }
  }

  async function propose(payload) {
    setError("");
    setBusyLabel("Working out your change");
    setStep("busy");
    try {
      const res = await onPropose(payload);
      const [only] = res.changes;
      if (res.changes.length === 1 && !only.destructive && res.clarifications.length === 0) return apply(res, res.changes);
      showReview(res, res.changes.map((c) => c.id));
    } catch (err) {
      setError(err?.message || "Couldn't work out that change. Try saying it another way.");
      setStep("input");
    }
  }

  async function handleStop() {
    const clip = await recorder.stop();
    if (!clip) return;
    setBusyLabel("Uploading your clip");
    setStep("busy");
    try {
      const file = new File([clip.blob], `quote-change-${Date.now()}.${clip.ext}`, { type: clip.blob.type || "audio/webm" });
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      await propose({ fileUri: file_uri, durationS: clip.durationS, manualTranscript: "" });
    } catch (err) {
      setError(err?.message || "Upload failed. Check your signal and try again, or type the change.");
      setStep("input");
    }
  }

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const footer = step === "review" && (
    <div className="flex gap-2 pb-1">
      <button type="button" onClick={() => setStep("input")} className="h-12 flex-1 rounded-2xl bg-secondary text-[15px] font-semibold text-foreground">
        Say it again
      </button>
      {proposal.changes.length > 0 && (
        <button type="button" disabled={chosen.length === 0} onClick={() => apply(proposal, chosen)} className="h-12 flex-[1.4] rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground disabled:opacity-40">
          {chosen.length === 1 ? "Apply change" : `Apply ${chosen.length} changes`}
        </button>
      )}
    </div>
  );

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      dismissible={step !== "busy"}
      title={step === "review" ? "Check the change" : "Change the quote"}
      description={step === "review" ? "Untick anything you don't want." : "Say what to change, like you'd tell an apprentice."}
      footer={footer}
    >
      {step === "busy" && (
        <div className="flex flex-col items-center py-12 text-center" aria-live="polite">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="mt-3 text-[15px] font-medium text-muted-foreground">{busyLabel}…</p>
        </div>
      )}
      {step === "input" && (
        <ChangeInput
          recorder={recorder}
          typed={typed}
          onTypedChange={setTyped}
          onStart={recorder.start}
          onStop={handleStop}
          onSubmitTyped={() => typed.trim() && propose({ fileUri: "", durationS: 6, manualTranscript: typed.trim() })}
          error={error}
        />
      )}
      {step === "review" && proposal && (
        <ChangeReview proposal={proposal} selected={selected} onToggle={toggle} preview={preview} currency={currency} error={error} />
      )}
    </BottomSheet>
  );
}