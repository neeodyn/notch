import { useState } from "react";
import { Link, createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ExternalLink, Link2, Mic, Plus, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";
import AreaItemCard from "@/components/notch/AreaItemCard";
import CheckAlertBanner from "@/components/notch/CheckAlertBanner";
import ClientDetailsCard from "@/components/notch/ClientDetailsCard";
import StatusPill from "@/components/notch/StatusPill";
import UpgradeTrialSheet from "@/components/notch/UpgradeTrialSheet";
import VoiceEditDock from "@/components/notch/VoiceEditDock";
import { calculateQuoteTotals, formatMoney } from "@/lib/pricing";
import {
  addOrDeleteQuoteItemFn,
  attachAreaPhotoFn,
  getQuoteWorkspace,
  markQuoteSentFn,
  undoQuoteChangeFn,
  updatePhotoPinFn,
  updateQuoteDetailsFn,
  updateQuoteItemFn,
  voiceEditQuoteFn,
} from "@/lib/server-fns";

export const Route = createFileRoute("/_authed/app/q/$id/check")({
  head: () => ({ meta: [{ title: "Review quote — Notch" }] }),
  loader: async ({ params }) => {
    const data = await getQuoteWorkspace({ data: { quoteId: params.id } });
    if (!data) throw notFound();
    return data;
  },
  component: CheckQuoteScreen,
});

function CheckQuoteScreen() {
  const { quote, items, photos, canUndo, business } = Route.useLoaderData();
  const router = useRouter();

  const runUpdateDetails = useServerFn(updateQuoteDetailsFn);
  const runUpdateItem = useServerFn(updateQuoteItemFn);
  const runAddDeleteItem = useServerFn(addOrDeleteQuoteItemFn);
  const runMovePin = useServerFn(updatePhotoPinFn);
  const runAttachPhoto = useServerFn(attachAreaPhotoFn);
  const runVoiceEdit = useServerFn(voiceEditQuoteFn);
  const runUndo = useServerFn(undoQuoteChangeFn);
  const runSendQuote = useServerFn(markQuoteSentFn);

  const [highlightedKeys, setHighlightedKeys] = useState([]);
  const [applyingVoice, setApplyingVoice] = useState(false);
  const [sending, setSending] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const currency = business?.currency || "NZD";
  const businessSettings = {
    default_stud_m: business?.default_stud_m ?? 2.4,
    openings_pct: business?.openings_pct ?? 10,
  };

  const totals = calculateQuoteTotals({
    items,
    tickedOptionalIds: quote.selected_optional_ids || [],
    minCharge: business?.min_charge || 0,
    gstRate: business?.gst_rate ?? 0.15,
    pricesIncludeGst: Boolean(business?.prices_include_gst),
    depositPct: quote.deposit_pct || 0,
  });

  function triggerFieldGlow(keys) {
    setHighlightedKeys(keys);
    window.setTimeout(() => setHighlightedKeys([]), 1100);
  }

  async function handleSaveClientPatch(patch) {
    await runUpdateDetails({ data: { quoteId: quote.id, patch } });
    await router.invalidate({ sync: true });
    toast.success("Client details saved");
  }

  async function handleDismissUnclear(idx) {
    const nextUnclear = (quote.unclear || []).filter((_, i) => i !== idx);
    await runUpdateDetails({
      data: { quoteId: quote.id, patch: { unclear: nextUnclear } },
    });
    await router.invalidate({ sync: true });
  }

  async function handleUpdateItem(itemId, patch) {
    await runUpdateItem({ data: { quoteId: quote.id, itemId, patch } });
    await router.invalidate({ sync: true });
  }

  async function handleSplitOptionalCeiling(itemId) {
    await runAddDeleteItem({
      data: { quoteId: quote.id, itemId, action: "split_optional_ceiling" },
    });
    await router.invalidate({ sync: true });
    toast("Ceiling split into an optional extra", {
      action: { label: "Undo", onClick: () => handleUndo() },
    });
  }

  async function handleDeleteItem(itemId) {
    await runAddDeleteItem({
      data: { quoteId: quote.id, itemId, action: "delete" },
    });
    await router.invalidate({ sync: true });
    toast("Area removed", {
      action: { label: "Undo", onClick: () => handleUndo() },
    });
  }

  async function handleAddArea() {
    await runAddDeleteItem({ data: { quoteId: quote.id, action: "add" } });
    await router.invalidate({ sync: true });
  }

  async function handleMovePin(photoId, pin_x, pin_y) {
    await runMovePin({ data: { photoId, pin_x, pin_y } });
    await router.invalidate({ sync: true });
  }

  async function handleAttachPhoto(itemId, areaNumber, fileUri) {
    await runAttachPhoto({
      data: { quoteId: quote.id, itemId, areaNumber, fileUri },
    });
    await router.invalidate({ sync: true });
  }

  async function handleUndo(versionId) {
    try {
      await runUndo({ data: { quoteId: quote.id, versionId } });
      await router.invalidate({ sync: true });
      toast.success("Change undone");
    } catch (err) {
      toast.error(err?.message || "Nothing to undo");
    }
  }

  async function handleApplyVoiceEdit({ fileUri, durationS, manualTranscript }) {
    setApplyingVoice(true);
    try {
      const res = await runVoiceEdit({
        data: {
          quoteId: quote.id,
          fileUri,
          durationS,
          manualTranscript,
        },
      });
      await router.invalidate({ sync: true });
      if (res.changedFields?.length) {
        triggerFieldGlow(res.changedFields);
      }
      toast(`Updated: "${res.transcript}"`, {
        duration: 6000,
        action: {
          label: "Undo",
          onClick: () => handleUndo(res.versionId),
        },
      });
    } catch (err) {
      toast.error(err?.message || "Could not apply change");
    } finally {
      setApplyingVoice(false);
    }
  }

  async function handleCopyShareLink() {
    const shareUrl = `${window.location.origin}/q/${quote.public_token}`;
    if (navigator.clipboard?.writeText) {
      const ok = await navigator.clipboard
        .writeText(shareUrl)
        .then(() => true)
        .catch(() => false);
      toast.success(ok ? "Homeowner quote link copied" : shareUrl);
    }
  }

  async function handleSendQuote() {
    if (sending) return;
    setSending(true);
    try {
      const res = await runSendQuote({ data: { quoteId: quote.id } });
      if (res.blockedByTrial) {
        setUpgradeOpen(true);
        return;
      }

      await router.invalidate({ sync: true });
      const shareUrl = `${window.location.origin}/q/${res.publicToken}`;
      const shareText = `Here is your painting quote from ${business?.name || "our team"}:`;

      if (navigator.share) {
        await navigator
          .share({
            title: `${business?.name || "Painting"} Quote`,
            text: shareText,
            url: shareUrl,
          })
          .catch(() => {});
      } else if (navigator.clipboard?.writeText) {
        const copied = await navigator.clipboard
          .writeText(shareUrl)
          .then(() => true)
          .catch(() => false);
        toast.success(
          copied ? "Quote link copied and marked Sent" : "Quote marked Sent"
        );
      } else {
        toast.success("Quote marked Sent");
      }
    } catch (err) {
      toast.error(err?.message || "Could not send quote");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-48 text-foreground">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4 sm:px-5">
          <Link
            to="/app"
            className="flex min-h-[44px] items-center gap-1.5 text-[16px] font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Quotes</span>
          </Link>

          <div className="flex items-center gap-1">
            {canUndo && (
              <button
                type="button"
                onClick={() => handleUndo()}
                className="flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-[14px] font-semibold text-foreground hover:bg-secondary"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Undo</span>
              </button>
            )}
            <Link
              to="/app/q/$id/capture"
              params={{ id: quote.id }}
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-[14px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <Mic className="h-4 w-4" />
              <span>Re-walk</span>
            </Link>
            <Link
              to="/q/$token"
              params={{ token: quote.public_token }}
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-[14px] font-medium text-primary hover:bg-accent"
            >
              <span>Preview</span>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto mt-5 max-w-2xl space-y-5 px-4 sm:px-5">
        <div className="flex items-center justify-between gap-2">
          <h1 className="large-title text-foreground">Check quote</h1>
          <StatusPill status={quote.status} />
        </div>

        {/* Amber Check These Banner */}
        <CheckAlertBanner
          unclear={quote.unclear || []}
          items={items}
          onDismissUnclear={handleDismissUnclear}
        />

        {/* Client Card */}
        <ClientDetailsCard
          quote={quote}
          highlightedKeys={highlightedKeys}
          onSavePatch={handleSaveClientPatch}
        />

        {/* Rooms & Areas */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[19px] font-bold tracking-[-0.015em] text-foreground">
              Rooms &amp; areas ({items.length})
            </h2>
            <button
              type="button"
              onClick={handleAddArea}
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-secondary px-3.5 text-[14px] font-semibold text-foreground"
            >
              <Plus className="h-4 w-4" />
              <span>Add room</span>
            </button>
          </div>

          {items.length === 0 ? (
            <div className="apple-surface rounded-[20px] border border-border bg-card p-8 text-center">
              <p className="text-[17px] font-semibold text-foreground">
                No rooms or areas yet
              </p>
              <p className="mt-1 text-[15px] text-muted-foreground">
                Tap Re-walk above to walk the property, tap Add room, or tap the mic button to speak a room.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const matchingPhotos = photos.filter(
                (p) =>
                  p.item_id === item.id ||
                  (!p.item_id && p.area_number === item.area_number)
              );
              return (
                <AreaItemCard
                  key={item.id}
                  item={item}
                  photos={matchingPhotos}
                  businessSettings={businessSettings}
                  currency={currency}
                  highlightedKeys={highlightedKeys}
                  onUpdateItem={handleUpdateItem}
                  onDeleteItem={handleDeleteItem}
                  onSplitOptionalCeiling={handleSplitOptionalCeiling}
                  onMovePin={handleMovePin}
                  onAttachPhoto={handleAttachPhoto}
                />
              );
            })
          )}
        </section>

        {/* GST Breakdown Card */}
        <section className="apple-surface space-y-2 rounded-[20px] border border-border bg-card p-5 text-[15px]">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal (excl. GST)</span>
            <span className="tabular-money font-medium text-foreground">
              {formatMoney(totals.subtotalExclGst, currency)}
            </span>
          </div>
          {totals.minChargeApplied && (
            <div className="flex justify-between text-muted-foreground">
              <span>Minimum job charge adjustment</span>
              <span className="tabular-money">
                +{formatMoney(totals.minChargeDelta, currency)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-muted-foreground">
            <span>GST ({totals.gstPctLabel}%)</span>
            <span className="tabular-money font-medium text-foreground">
              {formatMoney(totals.gstAmount, currency)}
            </span>
          </div>
          <div className="flex justify-between border-t border-border pt-2.5 text-[18px] font-bold text-foreground">
            <span>Total (incl. GST)</span>
            <span className="tabular-money">
              {formatMoney(totals.totalInclGst, currency)}
            </span>
          </div>
          {quote.deposit_pct > 0 && (
            <div className="flex justify-between text-[14px] font-semibold text-primary">
              <span>Deposit ({quote.deposit_pct}%)</span>
              <span className="tabular-money">
                {formatMoney(totals.depositAmount, currency)}
              </span>
            </div>
          )}
        </section>
      </main>

      {/* Floating 88px "Say a change" Mic */}
      <VoiceEditDock
        onApplyVoiceEdit={handleApplyVoiceEdit}
        isApplying={applyingVoice}
      />

      {/* Sticky Total + Send Bar */}
      <div className="glass-dock fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur-xl safe-bottom">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
          <div>
            <p className="tabular-money text-[22px] font-bold leading-tight text-foreground">
              {formatMoney(totals.totalInclGst, currency)}
            </p>
            <p className="tabular-money text-[12px] text-muted-foreground">
              {totals.unpricedCount > 0
                ? `${totals.unpricedCount} area needs your price`
                : `Incl. ${totals.gstPctLabel}% GST (${formatMoney(totals.subtotalExclGst, currency)} excl.)`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyShareLink}
              aria-label="Copy homeowner quote link"
              className="flex h-14 w-12 items-center justify-center rounded-2xl border border-border bg-background text-foreground hover:bg-secondary"
            >
              <Link2 className="h-5 w-5" />
            </button>
            <button
              type="button"
              disabled={sending}
              onClick={handleSendQuote}
              className="flex h-14 min-w-[148px] items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-[17px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Send className="h-5 w-5" />
              <span>{sending ? "Sending…" : "Send quote"}</span>
            </button>
          </div>
        </div>
      </div>

      <UpgradeTrialSheet open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
}