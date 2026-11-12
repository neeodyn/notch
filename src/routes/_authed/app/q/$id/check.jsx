import { useState } from "react";
import { Link, createFileRoute, notFound, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Link2, Mic, Plus, RotateCcw, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AppDock from "@/components/notch/AppDock";
import AppTopBar, { TopBarIcon } from "@/components/notch/AppTopBar";
import AreaItemCard from "@/components/notch/AreaItemCard";
import CheckAlertBanner from "@/components/notch/CheckAlertBanner";
import ClientDetailsCard from "@/components/notch/ClientDetailsCard";
import ConfirmDialog from "@/components/notch/ConfirmDialog";
import SnapPhotoStrip from "@/components/notch/SnapPhotoStrip";
import StatusPill from "@/components/notch/StatusPill";
import UpgradeTrialSheet from "@/components/notch/UpgradeTrialSheet";
import VoiceEditDock from "@/components/notch/VoiceEditDock";
import { calculateQuoteTotals, formatMoney } from "@/lib/pricing";
import { listPhotoTargets, orderPhotosBySnap, resolvePhotoTarget } from "@/lib/photos";
import { RESIDENTIAL_CONTRACT_THRESHOLD } from "@/lib/legal";
import { clearLocalCapture } from "@/lib/captureStore";
import { describeSaveError } from "@/lib/saveErrors";
import { shareQuoteLink } from "@/lib/shareQuote";
import {
  addOrDeleteQuoteItemFn,
  attachAreaPhotoFn,
  deleteDraftQuoteFn,
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
  const runDeleteDraft = useServerFn(deleteDraftQuoteFn);
  const navigate = useNavigate();

  const [highlightedKeys, setHighlightedKeys] = useState([]);
  const [applyingVoice, setApplyingVoice] = useState(false);
  const [sending, setSending] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [confirmUnpriced, setConfirmUnpriced] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const currency = business?.currency || "NZD";
  const businessSettings = {
    default_stud_m: business?.default_stud_m ?? 2.4,
    openings_pct: business?.openings_pct ?? 10,
  };

  const orderedPhotos = orderPhotosBySnap(photos);
  const photoTargets = listPhotoTargets(items);

  const totals = calculateQuoteTotals({
    items,
    tickedOptionalIds: quote.selected_optional_ids || [],
    minCharge: business?.min_charge || 0,
    gstRate: business?.gst_rate ?? 0.15,
    pricesIncludeGst: Boolean(business?.prices_include_gst),
    depositPct: quote.deposit_pct || 0,
  });

  const unpricedAreas = items.filter((it) => it.price == null || it.price_source === "none");

  function triggerFieldGlow(keys) {
    setHighlightedKeys(keys);
    window.setTimeout(() => setHighlightedKeys([]), 1100);
  }

  // Saves a change and refreshes the screen. Resolves false when it didn't go
  // through (usually no signal on site), after telling the painter so.
  async function saveChange(action) {
    try {
      await action();
      await router.invalidate({ sync: true });
      return true;
    } catch (err) {
      toast.error(describeSaveError(err));
      return false;
    }
  }

  async function handleSaveClientPatch(patch) {
    const saved = await saveChange(() =>
      runUpdateDetails({ data: { quoteId: quote.id, patch } })
    );
    if (saved) toast.success("Client details saved");
    return saved;
  }

  function handleDismissUnclear(idx) {
    const nextUnclear = (quote.unclear || []).filter((_, i) => i !== idx);
    return saveChange(() =>
      runUpdateDetails({ data: { quoteId: quote.id, patch: { unclear: nextUnclear } } })
    );
  }

  function handleUpdateItem(itemId, patch) {
    return saveChange(() =>
      runUpdateItem({ data: { quoteId: quote.id, itemId, patch } })
    );
  }

  async function handleSplitOptionalCeiling(itemId) {
    const saved = await saveChange(() =>
      runAddDeleteItem({
        data: { quoteId: quote.id, itemId, action: "split_optional_ceiling" },
      })
    );
    if (saved) {
      toast("Ceiling split into an optional extra", {
        action: { label: "Undo", onClick: () => handleUndo() },
      });
    }
  }

  async function handleDeleteItem(itemId) {
    const saved = await saveChange(() =>
      runAddDeleteItem({ data: { quoteId: quote.id, itemId, action: "delete" } })
    );
    if (saved) {
      toast("Area removed", {
        action: { label: "Undo", onClick: () => handleUndo() },
      });
    }
  }

  function handleAddArea() {
    return saveChange(() =>
      runAddDeleteItem({ data: { quoteId: quote.id, action: "add" } })
    );
  }

  function handleMovePin(photoId, pin_x, pin_y) {
    return saveChange(() => runMovePin({ data: { photoId, pin_x, pin_y } }));
  }

  async function handleAttachPhoto(itemId, areaNumber, fileUri) {
    await runAttachPhoto({
      data: { quoteId: quote.id, itemId, areaNumber, fileUri },
    });
    await router.invalidate({ sync: true });
  }

  async function handleMovePhoto(photo, target) {
    try {
      await runAttachPhoto({
        data: {
          quoteId: quote.id,
          photoId: photo.id,
          itemId: target.itemId,
          areaNumber: target.areaNumber,
        },
      });
      await router.invalidate({ sync: true });
      toast.success(`Photo ${photo.snap_number} moved to ${target.name}`);
    } catch (err) {
      toast.error(describeSaveError(err, err?.message || "Could not move photo"));
    }
  }

  async function handleUndo(versionId) {
    try {
      await runUndo({ data: { quoteId: quote.id, versionId } });
      await router.invalidate({ sync: true });
      toast.success("Change undone");
    } catch (err) {
      toast.error(describeSaveError(err, err?.message || "Nothing to undo"));
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
      toast.error(describeSaveError(err, err?.message || "Could not apply change"));
    } finally {
      setApplyingVoice(false);
    }
  }

  async function handleCopyShareLink() {
    const shareUrl = `${window.location.origin}/q/${quote.public_token}`;
    const copied = await navigator.clipboard?.writeText(shareUrl).then(
      () => true,
      () => false
    );
    if (copied) toast.success("Homeowner quote link copied");
    else toast(`Couldn't copy from this browser. The link is ${shareUrl}`, { duration: 12000 });
  }

  function handleSendQuote() {
    if (sending) return;
    if (items.length === 0) {
      toast.error("Add at least one room or area before sending.");
      return;
    }
    if (business?.trial_expired) {
      setUpgradeOpen(true);
      return;
    }
    if (unpricedAreas.length > 0) {
      setConfirmUnpriced(true);
      return;
    }
    sendQuote();
  }

  async function sendQuote() {
    setSending(true);
    try {
      // Share before anything else: iOS only opens the share sheet straight from
      // a tap. The quote is marked Sent once the link has actually gone out.
      const outcome = await shareQuoteLink({
        url: `${window.location.origin}/q/${quote.public_token}`,
        title: `${business?.name || "Painting"} Quote`,
        text: `Here is your painting quote from ${business?.name || "our team"}:`,
      });
      if (outcome === "dismissed") return;
      if (outcome === "failed") {
        toast.error("Couldn't open sharing here. Use the link button to copy the quote link.");
        return;
      }

      const res = await runSendQuote({ data: { quoteId: quote.id } });
      if (res.blockedByTrial) {
        setUpgradeOpen(true);
        return;
      }
      await router.invalidate({ sync: true });
      toast.success(
        outcome === "copied" ? "Quote link copied and marked Sent" : "Quote marked Sent"
      );
    } catch {
      toast.error(
        "Couldn't mark the quote as Sent. The link still works, and the quote updates once the homeowner opens it."
      );
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteDraft() {
    setConfirmDelete(false);
    try {
      await runDeleteDraft({ data: { quoteId: quote.id } });
      clearLocalCapture(quote.id).catch(() => {});
      toast.success("Draft deleted");
      await navigate({ to: "/app" });
    } catch (err) {
      toast.error(describeSaveError(err, "Couldn't delete this draft. Please try again."));
    }
  }

  return (
    <div className="min-h-dvh bg-background pb-52 text-foreground">
      <AppTopBar
        title="Check quote"
        actions={
          <>
            {canUndo && (
              <TopBarIcon label="Undo last change" onClick={() => handleUndo()}>
                <RotateCcw className="h-5 w-5" />
              </TopBarIcon>
            )}
            <TopBarIcon
              label="Preview homeowner quote"
              to="/q/$token"
              params={{ token: quote.public_token }}
            >
              <ExternalLink className="h-5 w-5" />
            </TopBarIcon>
          </>
        }
      />

      <main className="mx-auto mt-4 max-w-2xl space-y-5 px-4 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <StatusPill status={quote.status} />
          <Link
            to="/app/q/$id/capture"
            params={{ id: quote.id }}
            className="flex min-h-11 items-center gap-1.5 rounded-full bg-card px-3.5 text-[14px] font-semibold text-foreground"
          >
            <Mic className="h-4 w-4" />
            <span>Re-walk the house</span>
          </Link>
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

        {/* Photos in snap order */}
        <SnapPhotoStrip
          photos={orderedPhotos}
          targets={photoTargets}
          onMovePhoto={handleMovePhoto}
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
              const matchingPhotos = orderedPhotos.filter(
                (p) => resolvePhotoTarget(p, photoTargets)?.itemId === item.id
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
                  photoTargets={photoTargets}
                  onMovePhoto={handleMovePhoto}
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
          {totals.totalInclGst >= RESIDENTIAL_CONTRACT_THRESHOLD && (
            <p className="border-t border-border pt-2.5 text-[13px] leading-snug text-muted-foreground">
              Residential jobs of $30,000 or more incl. GST need a written contract, plus the prescribed checklist and disclosure statement, under the Building Act 2004.
            </p>
          )}
        </section>

        {quote.status === "draft" && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-[15px] font-semibold text-destructive hover:bg-secondary"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete this draft</span>
            </button>
          </div>
        )}
      </main>

      {/* Floating 88px "Say a change" Mic */}
      <VoiceEditDock
        onApplyVoiceEdit={handleApplyVoiceEdit}
        isApplying={applyingVoice}
      />

      <AppDock>
        <div className="min-w-0">
          <p className="tabular-money truncate text-[21px] font-bold leading-tight text-foreground">
            {formatMoney(totals.totalInclGst, currency)}
          </p>
          <p className="tabular-money truncate text-[12px] text-muted-foreground">
            {totals.unpricedCount > 0
              ? `${totals.unpricedCount} ${totals.unpricedCount === 1 ? "area needs" : "areas need"} your price`
              : `Incl. ${totals.gstPctLabel}% GST (${formatMoney(totals.subtotalExclGst, currency)} excl.)`}
          </p>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleCopyShareLink}
            aria-label="Copy homeowner quote link"
            className="flex h-12 w-11 items-center justify-center rounded-2xl border border-border bg-background text-foreground hover:bg-secondary"
          >
            <Link2 className="h-5 w-5" />
          </button>
          <button
            type="button"
            disabled={sending}
            onClick={handleSendQuote}
            className="flex h-12 min-w-[132px] items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-[16px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
            <span>{sending ? "Sending…" : quote.status === "draft" ? "Send quote" : "Send again"}</span>
          </button>
        </div>
      </AppDock>

      <ConfirmDialog
        open={confirmUnpriced}
        title={
          unpricedAreas.length === 1
            ? "1 area has no price yet"
            : `${unpricedAreas.length} areas have no price yet`
        }
        description={`The homeowner will see “TBC” for ${unpricedAreas
          .map((it) => it.name || `Area ${it.area_number}`)
          .join(", ")}, and the total won't include ${unpricedAreas.length === 1 ? "it" : "them"}.`}
        confirmLabel="Send anyway"
        cancelLabel="Set prices first"
        onConfirm={() => {
          setConfirmUnpriced(false);
          sendQuote();
        }}
        onCancel={() => setConfirmUnpriced(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this draft?"
        description="The rooms, photos and recording on this draft will be removed. This can't be undone."
        confirmLabel="Delete draft"
        cancelLabel="Keep draft"
        destructive
        onConfirm={handleDeleteDraft}
        onCancel={() => setConfirmDelete(false)}
      />

      <UpgradeTrialSheet open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
}