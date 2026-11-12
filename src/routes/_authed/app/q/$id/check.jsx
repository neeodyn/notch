import { useState } from "react";
import { Link, createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ExternalLink, Mic, Plus, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";
import CheckAlertBanner from "@/components/notch/CheckAlertBanner";
import ClientDetailsCard from "@/components/notch/ClientDetailsCard";
import StatusPill from "@/components/notch/StatusPill";
import TreeItemCard from "@/components/notch/TreeItemCard";
import UpgradeTrialSheet from "@/components/notch/UpgradeTrialSheet";
import VoiceEditDock from "@/components/notch/VoiceEditDock";
import { calculateQuoteTotals, formatMoney } from "@/lib/pricing";
import {
  addOrDeleteQuoteItemFn,
  attachTreePhotoFn,
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
  const runAttachPhoto = useServerFn(attachTreePhotoFn);
  const runVoiceEdit = useServerFn(voiceEditQuoteFn);
  const runUndo = useServerFn(undoQuoteChangeFn);
  const runSendQuote = useServerFn(markQuoteSentFn);

  const [highlightedKeys, setHighlightedKeys] = useState([]);
  const [applyingVoice, setApplyingVoice] = useState(false);
  const [sending, setSending] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const currency = business?.currency || "USD";
  const totals = calculateQuoteTotals({
    items,
    tickedOptionalIds: quote.selected_optional_ids || [],
    minCharge: business?.min_charge || 0,
    taxRate: business?.tax_rate || 0,
    depositPct: quote.deposit_pct || 0,
  });

  function triggerFieldGlow(keys) {
    setHighlightedKeys(keys);
    window.setTimeout(() => setHighlightedKeys([]), 1100);
  }

  async function handleSaveClientPatch(patch) {
    await runUpdateDetails({ data: { quoteId: quote.id, patch } });
    await router.invalidate();
    toast.success("Client details updated");
  }

  async function handleDismissUnclear(idx) {
    const nextUnclear = (quote.unclear || []).filter((_, i) => i !== idx);
    await runUpdateDetails({ data: { quoteId: quote.id, patch: { unclear: nextUnclear } } });
    await router.invalidate();
  }

  async function handleUpdateItem(itemId, patch) {
    await runUpdateItem({ data: { quoteId: quote.id, itemId, patch } });
    await router.invalidate();
  }

  async function handleDeleteItem(itemId) {
    await runAddDeleteItem({ data: { quoteId: quote.id, itemId, action: "delete" } });
    await router.invalidate();
    toast("Item removed", {
      action: { label: "Undo", onClick: () => handleUndo() },
    });
  }

  async function handleAddTree() {
    await runAddDeleteItem({ data: { quoteId: quote.id, action: "add" } });
    await router.invalidate();
  }

  async function handleMovePin(photoId, pin_x, pin_y) {
    await runMovePin({ data: { photoId, pin_x, pin_y } });
    await router.invalidate();
  }

  async function handleAttachPhoto(itemId, treeNumber, fileUri) {
    await runAttachPhoto({
      data: { quoteId: quote.id, itemId, treeNumber, fileUri },
    });
    await router.invalidate();
  }

  async function handleUndo(versionId) {
    try {
      await runUndo({ data: { quoteId: quote.id, versionId } });
      await router.invalidate();
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
      const shareText = `Here is your tree work quote from ${business?.name || "our crew"}:`;

      if (navigator.share) {
        await navigator
          .share({
            title: `${business?.name || "Tree Care"} Quote`,
            text: shareText,
            url: shareUrl,
          })
          .catch(() => {});
      } else if (navigator.clipboard?.writeText) {
        const copied = await navigator.clipboard
          .writeText(shareUrl)
          .then(() => true)
          .catch(() => false);
        toast.success(copied ? "Quote link copied and marked Sent" : "Quote marked Sent");
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
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4 sm:px-5">
          <Link
            to="/app"
            className="flex min-h-[44px] items-center gap-1.5 text-[16px] font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Quotes</span>
          </Link>

          <div className="flex items-center gap-1.5">
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

        {/* Tree Cards */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[19px] font-bold tracking-[-0.015em] text-foreground">
              Trees &amp; line items ({items.length})
            </h2>
            <button
              type="button"
              onClick={handleAddTree}
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-secondary px-3.5 text-[14px] font-semibold text-foreground"
            >
              <Plus className="h-4 w-4" />
              <span>Add tree</span>
            </button>
          </div>

          {items.length === 0 ? (
            <div className="rounded-[18px] border border-border bg-card p-8 text-center">
              <p className="text-[17px] font-semibold text-foreground">No trees added yet</p>
              <p className="mt-1 text-[15px] text-muted-foreground">
                Tap Re-walk above to record the yard, tap Add tree, or tap the mic button to speak a tree item.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const matchingPhotos = photos.filter(
                (p) => p.item_id === item.id || (!p.item_id && p.tree_number === item.tree_number)
              );
              return (
                <TreeItemCard
                  key={item.id}
                  item={item}
                  photos={matchingPhotos}
                  currency={currency}
                  highlightedKeys={highlightedKeys}
                  onUpdateItem={handleUpdateItem}
                  onDeleteItem={handleDeleteItem}
                  onMovePin={handleMovePin}
                  onAttachPhoto={handleAttachPhoto}
                />
              );
            })
          )}
        </section>
      </main>

      {/* Floating 88px "Say a change" Mic */}
      <VoiceEditDock onApplyVoiceEdit={handleApplyVoiceEdit} isApplying={applyingVoice} />

      {/* Sticky Total + Send Bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur-md safe-bottom">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
          <div>
            <p className="tabular-money text-[22px] font-bold leading-tight text-foreground">
              {formatMoney(totals.total, currency)}
            </p>
            <p className="tabular-money text-[13px] text-muted-foreground">
              {totals.unpricedCount > 0
                ? `${totals.unpricedCount} item needs price`
                : quote.deposit_pct > 0
                ? `${quote.deposit_pct}% deposit (${formatMoney(totals.depositAmount, currency)})`
                : business?.tax_rate > 0
                ? `Includes ${business.tax_rate}% tax`
                : "Base total"}
            </p>
          </div>

          <button
            type="button"
            disabled={sending}
            onClick={handleSendQuote}
            className="flex h-14 min-w-[152px] items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-[17px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
            <span>{sending ? "Sending…" : "Send quote"}</span>
          </button>
        </div>
      </div>

      <UpgradeTrialSheet open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
}