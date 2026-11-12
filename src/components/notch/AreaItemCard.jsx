import { useState } from "react";
import { Camera, Crosshair, Split, Trash2, X } from "lucide-react";
import { Image } from "@/components/ui/image";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import PriceSourceBadge from "@/components/notch/PriceSourceBadge";
import {
  ALL_SURFACES,
  KIND_LABELS,
  PREP_LABELS,
  SURFACE_LABELS,
  formatAreaSummaryLine,
  formatMoney,
} from "@/lib/pricing";

export default function AreaItemCard({
  item,
  photos = [],
  businessSettings = {},
  currency = "NZD",
  highlightedKeys = [],
  onUpdateItem,
  onDeleteItem,
  onSplitOptionalCeiling,
  onMovePin,
  onAttachPhoto,
}) {
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState(item.price != null ? String(item.price) : "");
  const [expandedEdit, setExpandedEdit] = useState(false);
  const [markingSpot, setMarkingSpot] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const primaryPhoto = photos[0] || null;
  const hasSpotPin = primaryPhoto && primaryPhoto.pin_x != null && primaryPhoto.pin_y != null;
  const isHighlighted = highlightedKeys.some((k) => k.startsWith(`area:${item.area_number}:`));

  const summaryLine = formatAreaSummaryLine(item, businessSettings, currency);
  const canSplitCeiling =
    !item.is_optional_split &&
    Array.isArray(item.surfaces) &&
    item.surfaces.includes("walls") &&
    item.surfaces.includes("ceiling");

  async function savePrice() {
    const val = priceInput.trim() === "" ? null : Math.max(0, Number(priceInput));
    await onUpdateItem(item.id, {
      price: val,
      price_source: val == null ? "none" : "owner",
    });
    setEditingPrice(false);
  }

  function handlePhotoTap(e) {
    if (!primaryPhoto || !onMovePin) return;
    if (!markingSpot && !hasSpotPin) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pin_x = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width));
    const pin_y = Math.max(0.05, Math.min(0.95, (e.clientY - rect.top) / rect.height));
    onMovePin(primaryPhoto.id, pin_x, pin_y);
    setMarkingSpot(false);
  }

  function toggleSurface(surf) {
    const current = Array.isArray(item.surfaces) ? item.surfaces : [];
    const next = current.includes(surf)
      ? current.filter((s) => s !== surf)
      : [...current, surf];
    onUpdateItem(item.id, { surfaces: next });
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file || !onAttachPhoto) return;
    setUploadingPhoto(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      await onAttachPhoto(item.id, item.area_number, file_uri);
      toast.success("Room photo attached");
    } catch (err) {
      toast.error(err?.message || "Could not upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  }

  return (
    <article
      id={`area-card-${item.id}`}
      className={`apple-surface overflow-hidden rounded-[20px] border border-border bg-card transition-shadow ${
        isHighlighted ? "field-changed-glow" : ""
      }`}
    >
      {/* Room Photo with Optional "Mark a spot" Pin */}
      {!item.is_optional_split && primaryPhoto?.url && (
        <div
          onClick={handlePhotoTap}
          className={`relative aspect-[16/10] w-full overflow-hidden bg-zinc-900 ${
            markingSpot || hasSpotPin ? "cursor-crosshair" : ""
          }`}
        >
          <Image
            src={primaryPhoto.url}
            alt={item.name || `Area ${item.area_number}`}
            className="h-full w-full object-cover"
          />

          {hasSpotPin && (
            <span
              style={{
                left: `${primaryPhoto.pin_x * 100}%`,
                top: `${primaryPhoto.pin_y * 100}%`,
              }}
              className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-primary text-[13px] font-bold text-white shadow-md"
            >
              {item.area_number}
            </span>
          )}

          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
            {hasSpotPin ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMovePin(primaryPhoto.id, null, null);
                }}
                className="flex min-h-[36px] items-center gap-1 rounded-xl bg-black/70 px-3 text-[12px] font-semibold text-white backdrop-blur-md hover:bg-black/85"
              >
                <X className="h-3.5 w-3.5" />
                <span>Clear spot</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMarkingSpot((m) => !m);
                }}
                className={`flex min-h-[36px] items-center gap-1.5 rounded-xl px-3 text-[12px] font-semibold text-white backdrop-blur-md ${
                  markingSpot ? "bg-primary" : "bg-black/65 hover:bg-black/80"
                }`}
              >
                <Crosshair className="h-3.5 w-3.5" />
                <span>{markingSpot ? "Tap photo to place spot" : "Mark a spot"}</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-primary px-2 text-[12px] font-bold text-primary-foreground">
                {item.area_number}
              </span>
              <h3 className="text-[18px] font-semibold text-foreground">
                {item.name || `Area ${item.area_number}`}
              </h3>
              {item.optional && (
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-[12px] font-semibold text-accent-foreground">
                  Optional
                </span>
              )}
              {item.colour && (
                <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[12px] font-medium text-foreground">
                  {item.colour}
                </span>
              )}
            </div>

            {/* Required single-line painter spec */}
            <p className="tabular-money mt-1.5 text-[14px] font-medium text-muted-foreground">
              {summaryLine}
            </p>
          </div>

          {/* Tap-to-edit Price */}
          <div className="shrink-0 text-right">
            {editingPrice ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  step="10"
                  autoFocus
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") savePrice();
                  }}
                  className="tabular-money h-11 w-28 rounded-xl border border-input bg-background px-2.5 text-right text-[17px] font-bold"
                />
                <button
                  type="button"
                  onClick={savePrice}
                  className="h-11 rounded-xl bg-primary px-3 text-[14px] font-semibold text-primary-foreground"
                >
                  OK
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPriceInput(item.price != null ? String(item.price) : "");
                  setEditingPrice(true);
                }}
                className="min-h-[44px] rounded-xl px-2 py-1 text-right hover:bg-secondary"
              >
                <span
                  className={`tabular-money block text-[20px] font-bold ${
                    item.price == null
                      ? "text-[hsl(var(--amber-ink))]"
                      : "text-foreground"
                  }`}
                >
                  {formatMoney(item.price, currency)}
                </span>
              </button>
            )}
            <div className="mt-0.5 flex justify-end">
              <PriceSourceBadge source={item.price_source} flagged={item.flagged} />
            </div>
          </div>
        </div>

        {/* Fast 1-Tap Coat & Prep Strip */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {[1, 2, 3].map((c) => {
            const active = Number(item.coats || 2) === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => onUpdateItem(item.id, { coats: c })}
                className={`min-h-[36px] rounded-lg px-2.5 text-[13px] font-semibold transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {c} {c === 1 ? "coat" : "coats"}
              </button>
            );
          })}

          <span className="mx-0.5 text-border">|</span>

          {["light", "standard", "heavy"].map((p) => {
            const active = (item.prep || "standard") === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onUpdateItem(item.id, { prep: p })}
                className={`min-h-[36px] rounded-lg px-2.5 text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-accent text-accent-foreground font-semibold"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "standard" ? "Std prep" : p === "light" ? "Light prep" : "Heavy prep"}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-[15px] leading-[1.48] text-muted-foreground">
          {item.customer_description}
        </p>

        {/* Action Bar */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setExpandedEdit((v) => !v)}
              className="min-h-[44px] rounded-xl bg-secondary px-3.5 text-[14px] font-semibold text-foreground"
            >
              {expandedEdit ? "Done" : "Dimensions & surfaces"}
            </button>

            {canSplitCeiling && onSplitOptionalCeiling && (
              <button
                type="button"
                onClick={() => onSplitOptionalCeiling(item.id)}
                className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-border px-3 text-[13px] font-semibold text-muted-foreground hover:text-foreground"
              >
                <Split className="h-3.5 w-3.5" />
                <span>Ceiling optional</span>
              </button>
            )}

            {!item.is_optional_split && !primaryPhoto && (
              <label className="flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border border-border px-3 text-[14px] font-medium text-muted-foreground hover:text-foreground">
                <Camera className="h-4 w-4" />
                <span>{uploadingPhoto ? "Saving…" : "Add photo"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
            )}
          </div>

          <button
            type="button"
            onClick={() => onDeleteItem(item.id)}
            aria-label="Remove room or area"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Full Tap-to-Edit Drawer */}
        {expandedEdit && (
          <div className="mt-3 space-y-3.5 rounded-2xl bg-background p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block sm:col-span-2">
                <span className="text-[12px] font-medium text-muted-foreground">
                  Room / area name
                </span>
                <input
                  type="text"
                  defaultValue={item.name || ""}
                  onBlur={(e) => onUpdateItem(item.id, { name: e.target.value })}
                  className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-[15px]"
                />
              </label>
              <label className="block">
                <span className="text-[12px] font-medium text-muted-foreground">Type</span>
                <select
                  value={item.kind || "interior"}
                  onChange={(e) => onUpdateItem(item.id, { kind: e.target.value })}
                  className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-[15px]"
                >
                  {Object.entries(KIND_LABELS).map(([k, lbl]) => (
                    <option key={k} value={k}>
                      {lbl}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {item.kind === "exterior" ? (
              <label className="block">
                <span className="text-[12px] font-medium text-muted-foreground">
                  Exterior area (m²)
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={item.area_m2_spoken ?? ""}
                  onBlur={(e) =>
                    onUpdateItem(item.id, {
                      area_m2_spoken: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  className="tabular-money mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-[15px]"
                />
              </label>
            ) : (
              <div className="grid grid-cols-3 gap-2.5">
                <label className="block">
                  <span className="text-[12px] font-medium text-muted-foreground">
                    Length (m)
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    defaultValue={item.length_m ?? ""}
                    onBlur={(e) =>
                      onUpdateItem(item.id, {
                        length_m: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    className="tabular-money mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-[15px]"
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] font-medium text-muted-foreground">
                    Width (m)
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    defaultValue={item.width_m ?? ""}
                    onBlur={(e) =>
                      onUpdateItem(item.id, {
                        width_m: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    className="tabular-money mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-[15px]"
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] font-medium text-muted-foreground">
                    Stud (m)
                  </span>
                  <input
                    type="number"
                    min="1.5"
                    step="0.1"
                    defaultValue={item.stud_m ?? ""}
                    placeholder={String(businessSettings.default_stud_m || 2.4)}
                    onBlur={(e) =>
                      onUpdateItem(item.id, {
                        stud_m: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    className="tabular-money mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-[15px]"
                  />
                </label>
              </div>
            )}

            <div>
              <span className="text-[12px] font-medium text-muted-foreground">Surfaces</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {ALL_SURFACES.map((surf) => {
                  const selected = (item.surfaces || []).includes(surf);
                  return (
                    <button
                      key={surf}
                      type="button"
                      onClick={() => toggleSurface(surf)}
                      className={`min-h-[38px] rounded-xl px-3 text-[13px] font-semibold transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {SURFACE_LABELS[surf]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <label className="block">
                <span className="text-[12px] font-medium text-muted-foreground">Doors</span>
                <input
                  type="number"
                  min="0"
                  defaultValue={item.doors ?? 0}
                  onBlur={(e) =>
                    onUpdateItem(item.id, { doors: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="tabular-money mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-[15px]"
                />
              </label>
              <label className="block">
                <span className="text-[12px] font-medium text-muted-foreground">Windows</span>
                <input
                  type="number"
                  min="0"
                  defaultValue={item.windows ?? 0}
                  onBlur={(e) =>
                    onUpdateItem(item.id, {
                      windows: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="tabular-money mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-[15px]"
                />
              </label>
              <label className="block">
                <span className="text-[12px] font-medium text-muted-foreground">Prep</span>
                <select
                  value={item.prep || "standard"}
                  onChange={(e) => onUpdateItem(item.id, { prep: e.target.value })}
                  className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-2.5 text-[14px]"
                >
                  {Object.entries(PREP_LABELS).map(([k, lbl]) => (
                    <option key={k} value={k}>
                      {lbl}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <label className="block">
                <span className="text-[12px] font-medium text-muted-foreground">
                  Colour (e.g. Resene Alabaster)
                </span>
                <input
                  type="text"
                  defaultValue={item.colour || ""}
                  onBlur={(e) => onUpdateItem(item.id, { colour: e.target.value })}
                  className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-[15px]"
                />
              </label>
              <label className="flex min-h-[44px] items-center gap-2.5 pt-5 text-[14px] font-medium">
                <input
                  type="checkbox"
                  checked={Boolean(item.optional)}
                  onChange={(e) => onUpdateItem(item.id, { optional: e.target.checked })}
                  className="h-5 w-5 accent-[hsl(var(--primary))]"
                />
                <span>Homeowner optional extra</span>
              </label>
            </div>

            <label className="block">
              <span className="text-[12px] font-medium text-muted-foreground">
                Homeowner description
              </span>
              <textarea
                rows={2}
                defaultValue={item.customer_description || ""}
                onBlur={(e) =>
                  onUpdateItem(item.id, { customer_description: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-input bg-card p-3 text-[15px]"
              />
            </label>
          </div>
        )}
      </div>
    </article>
  );
}