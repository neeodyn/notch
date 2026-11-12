import { useState } from "react";
import { Link, createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Footprints, Mic, Plus, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";
import AppDock from "@/components/notch/AppDock";
import AppTopBar, { TopBarIcon } from "@/components/notch/AppTopBar";
import AreaItemCard from "@/components/notch/AreaItemCard";
import CheckAlertBanner from "@/components/notch/CheckAlertBanner";
import ClientDetailsCard from "@/components/notch/ClientDetailsCard";
import QuoteTotalsCard from "@/components/notch/QuoteTotalsCard";
import SnapPhotoStrip from "@/components/notch/SnapPhotoStrip";
import StatusPill from "@/components/notch/StatusPill";
import UpgradeTrialSheet from "@/components/notch/UpgradeTrialSheet";
import QuoteChangeSheet from "@/components/notch/change/QuoteChangeSheet";
import ShareQuoteSheet from "@/components/notch/share/ShareQuoteSheet";
import { calculateQuoteTotals, formatMoney } from "@/lib/pricing";
import { listPhotoTargets, orderPhotosBySnap, resolvePhotoTarget } from "@/lib/photos";
import {
  addOrDeleteQuoteItemFn,
  applyVoiceEditFn,
  attachAreaPhotoFn,
  getQuoteWorkspace,
  markQuoteSentFn,
  proposeVoiceEditFn,
  undoQuoteChangeFn,
  updatePhotoPinFn,
  updateQuoteDetailsFn,
  updateQuoteItemFn,
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
  const runPropose = useServerFn(proposeVoiceEditFn);
  const runApplyEdit = useServerFn(applyVoiceEditFn);
  const runUndo = useServerFn(undoQuoteChangeFn);
  const runMarkSent = useServerFn(markQuoteSentFn);

  const [highlightedKeys, setHighlightedKeys] = useState([]);
  const [changeOpen, setChangeOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

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
      toast.error(err?.message || "Could not move photo");
    }
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

  function handleProposeChange(payload) {
    return runPropose({ data: { quoteId: quote.id, ...payload } });
  }

  async function handleApplyChanges({ transcript, changes }) {
    const res = await runApplyEdit({
      data: {
        quoteId: quote.id,
        transcript,
        changes: changes.map(({ id, op, itemId, field, before, after }) => ({
          id,
          op,
          itemId: itemId ?? null,
          field: field ?? null,
          before,
          after,
        })),
      },
    });
    await router.invalidate({ sync: true });
    if (res.changedFields?.length) triggerFieldGlow(res.changedFields);
    toast.success(changes.length === 1 ? "Change applied" : `${changes.length} changes applied`, {
      duration: 6000,
      action: { label: "Undo", onClick: () => handleUndo(res.versionId) },
    });
  }

  function openShare() {
    if (quote.status === "draft" && business?.trial_expired) {
      setUpgradeOpen(true);
      return;
    }
    setShareOpen(true);
  }

  async function handleMarkSent(channel) {
    const res = await runMarkSent({ data: { quoteId: quote.id, channel } });
    if (res.blockedByTrial) {
      setShareOpen(false);
      setUpgradeOpen(true);
      return res;
    }
    await router.invalidate({ sync: true });
    return res;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
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

      <main className="mx-auto mt-4 w-full max-w-2xl flex-1 space-y-5 px-4 pb-8 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <StatusPill status={quote.status} />
          <Link
            to="/app/q/$id/capture"
            params={{ id: quote.id }}
            className="flex min-h-11 items-center gap-1.5 rounded-full bg-card px-3.5 text-[14px] font-semibold text-foreground"
          >
            <Footprints className="h-4 w-4" />
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
                Re-walk the house, tap Add room, or tap the mic below and say the room.
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

        <QuoteTotalsCard totals={totals} currency={currency} depositPct={quote.deposit_pct || 0} />
      </main>

      <AppDock>
        <button
          type="button"
          onClick={() => setChangeOpen(true)}
          aria-label="Say a change"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-secondary/80"
        >
          <Mic className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="tabular-money truncate text-[20px] font-bold leading-tight text-foreground">
            {formatMoney(totals.totalInclGst, currency)}
          </p>
          <p className="tabular-money truncate text-[12px] text-muted-foreground">
            {totals.unpricedCount > 0
              ? `${totals.unpricedCount} ${totals.unpricedCount === 1 ? "area needs" : "areas need"} your price`
              : `Incl. ${totals.gstPctLabel}% GST`}
          </p>
        </div>

        <button
          type="button"
          onClick={openShare}
          className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-[16px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Send className="h-5 w-5" />
          <span>{quote.status === "draft" ? "Send" : "Share"}</span>
        </button>
      </AppDock>

      <QuoteChangeSheet
        open={changeOpen}
        onOpenChange={setChangeOpen}
        quote={quote}
        items={items}
        business={business}
        currency={currency}
        onPropose={handleProposeChange}
        onApply={handleApplyChanges}
      />

      <ShareQuoteSheet
        open={shareOpen}
        onOpenChange={setShareOpen}
        quote={quote}
        business={business}
        total={totals.totalInclGst}
        currency={currency}
        onMarkSent={handleMarkSent}
      />

      <UpgradeTrialSheet open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
}