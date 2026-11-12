import { useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { Image } from "@/components/ui/image";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import PriceSourceBadge from "@/components/notch/PriceSourceBadge";
import { formatMoney, HAZARD_LABELS, SIZE_LABELS, WORK_LABELS } from "@/lib/pricing";

export default function TreeItemCard({
  item,
  photos = [],
  currency = "USD",
  highlightedKeys = [],
  onUpdateItem,
  onDeleteItem,
  onMovePin,
  onAttachPhoto,
}) {
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState(item.price != null ? String(item.price) : "");
  const [expandedEdit, setExpandedEdit] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const primaryPhoto = photos[0] || null;
  const isTreeHighlighted = highlightedKeys.some((k) => k.startsWith(`tree:${item.tree_number}:`));

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
    const rect = e.currentTarget.getBoundingClientRect();
    const pin_x = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width));
    const pin_y = Math.max(0.05, Math.min(0.95, (e.clientY - rect.top) / rect.height));
    onMovePin(primaryPhoto.id, pin_x, pin_y);
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file || !onAttachPhoto) return;
    setUploadingPhoto(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      await onAttachPhoto(item.id, item.tree_number, file_uri);
      toast.success("Tree photo saved");
    } catch (err) {
      toast.error(err?.message || "Could not upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  }

  return (
    <article
      id={`tree-card-${item.id}`}
      className={`overflow-hidden rounded-[18px] border border-border bg-card transition-shadow ${
        isTreeHighlighted ? "field-changed-glow" : ""
      }`}
    >
      {/* Photo with repositionable numbered pin */}
      {!item.is_stump_line && primaryPhoto?.url && (
        <div
          onClick={handlePhotoTap}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") handlePhotoTap(e);
          }}
          aria-label="Tap photo to move numbered tree pin"
          className="relative aspect-[16/10] w-full cursor-crosshair overflow-hidden bg-zinc-900"
        >
          <Image src={primaryPhoto.url} alt={item.label || `Tree ${item.tree_number}`} className="h-full w-full object-cover" />
          <span
            style={{
              left: `${(primaryPhoto.pin_x ?? 0.5) * 100}%`,
              top: `${(primaryPhoto.pin_y ?? 0.4) * 100}%`,
            }}
            className="absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-primary text-[15px] font-bold text-white shadow-md"
          >
            {item.tree_number}
          </span>
          <span className="absolute bottom-2.5 right-2.5 rounded-lg bg-black/65 px-2.5 py-1 text-[12px] text-white backdrop-blur-sm">
            Tap to move pin
          </span>
        </div>
      )}

      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-primary px-2 text-[12px] font-bold text-primary-foreground">
                {item.tree_number}
              </span>
              <h3 className="text-[18px] font-semibold text-foreground">{item.label || `Tree ${item.tree_number}`}</h3>
              {item.optional && (
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-[12px] font-semibold text-accent-foreground">
                  Optional item
                </span>
              )}
            </div>
            <p className="mt-1 text-[14px] text-muted-foreground">
              {WORK_LABELS[item.work] || "Tree work"}
              {item.height_ft ? ` · ${item.height_ft} ft` : item.size_class ? ` · ${SIZE_LABELS[item.size_class]}` : ""}
              {!item.is_stump_line && item.stump === "grind" ? " · Stump grind included" : ""}
              {!item.is_stump_line && item.haul ? " · Haul debris" : ""}
            </p>
          </div>

          {/* Tap-to-edit Price */}
          <div className="text-right">
            {editingPrice ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  step="25"
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
                    item.price == null ? "text-[hsl(var(--amber-ink))]" : "text-foreground"
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

        {Array.isArray(item.hazards) && item.hazards.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {item.hazards.map((hz) => (
              <span key={hz} className="rounded-lg bg-secondary px-2.5 py-0.5 text-[12px] font-medium text-foreground">
                {HAZARD_LABELS[hz] || hz}
              </span>
            ))}
          </div>
        )}

        <p className="mt-3 text-[15px] leading-[1.48] text-muted-foreground">{item.customer_description}</p>

        {/* Action row */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExpandedEdit((v) => !v)}
              className="min-h-[44px] rounded-xl bg-secondary px-3.5 text-[14px] font-semibold text-foreground"
            >
              {expandedEdit ? "Done editing" : "Edit details"}
            </button>

            {!item.is_stump_line && !primaryPhoto && (
              <label className="flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border border-border px-3 text-[14px] font-medium text-muted-foreground hover:text-foreground">
                <Camera className="h-4 w-4" />
                <span>{uploadingPhoto ? "Saving…" : "Add photo"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
              </label>
            )}
          </div>

          <button
            type="button"
            onClick={() => onDeleteItem(item.id)}
            aria-label="Remove item"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Inline Tap-to-Edit Drawer */}
        {expandedEdit && (
          <div className="mt-3 space-y-3 rounded-2xl bg-background p-3.5">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[12px] font-medium text-muted-foreground">Label / species</span>
                <input
                  type="text"
                  defaultValue={item.label || ""}
                  onBlur={(e) => onUpdateItem(item.id, { label: e.target.value, species: e.target.value })}
                  className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-[15px]"
                />
              </label>
              <label className="block">
                <span className="text-[12px] font-medium text-muted-foreground">Work</span>
                <select
                  value={item.work || "trim"}
                  onChange={(e) => onUpdateItem(item.id, { work: e.target.value })}
                  className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-[15px]"
                >
                  {Object.entries(WORK_LABELS).map(([k, lbl]) => (
                    <option key={k} value={k}>
                      {lbl}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[12px] font-medium text-muted-foreground">Size class</span>
                <select
                  value={item.size_class || "medium"}
                  onChange={(e) => onUpdateItem(item.id, { size_class: e.target.value })}
                  className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-[15px]"
                >
                  {Object.entries(SIZE_LABELS).map(([k, lbl]) => (
                    <option key={k} value={k}>
                      {lbl}
                    </option>
                  ))}
                </select>
              </label>
              {!item.is_stump_line && (
                <label className="block">
                  <span className="text-[12px] font-medium text-muted-foreground">Stump</span>
                  <select
                    value={item.stump || "leave"}
                    onChange={(e) => onUpdateItem(item.id, { stump: e.target.value })}
                    className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-[15px]"
                  >
                    <option value="leave">Leave stump</option>
                    <option value="grind">Grind stump (included)</option>
                    <option value="optional">Separate optional item</option>
                  </select>
                </label>
              )}
            </div>

            <div className="flex flex-wrap gap-4 pt-1">
              {!item.is_stump_line && (
                <label className="flex min-h-[44px] items-center gap-2 text-[15px]">
                  <input
                    type="checkbox"
                    checked={Boolean(item.haul)}
                    onChange={(e) => onUpdateItem(item.id, { haul: e.target.checked })}
                    className="h-5 w-5 accent-[hsl(var(--primary))]"
                  />
                  <span>Include debris haul-away</span>
                </label>
              )}
              <label className="flex min-h-[44px] items-center gap-2 text-[15px]">
                <input
                  type="checkbox"
                  checked={Boolean(item.optional)}
                  onChange={(e) => onUpdateItem(item.id, { optional: e.target.checked })}
                  className="h-5 w-5 accent-[hsl(var(--primary))]"
                />
                <span>Homeowner optional line item</span>
              </label>
            </div>

            <label className="block">
              <span className="text-[12px] font-medium text-muted-foreground">Homeowner description</span>
              <textarea
                rows={2}
                defaultValue={item.customer_description || ""}
                onBlur={(e) => onUpdateItem(item.id, { customer_description: e.target.value })}
                className="mt-1 w-full rounded-xl border border-input bg-card p-3 text-[15px]"
              />
            </label>
          </div>
        )}
      </div>
    </article>
  );
}