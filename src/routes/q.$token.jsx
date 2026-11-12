import { useEffect, useState } from "react";
import { Link, createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, PaintRoller, Phone, Printer } from "lucide-react";
import { toast } from "sonner";
import { Image } from "@/components/ui/image";
import HomeownerAcceptBar from "@/components/notch/HomeownerAcceptBar";
import {
  PREP_LABELS,
  calculateQuoteTotals,
  fmtMetric,
  formatMoney,
  formatSurfaceMetricsList,
} from "@/lib/pricing";
import {
  getPublicQuoteByTokenFn,
  recordPublicQuoteViewFn,
  respondToPublicQuoteFn,
} from "@/lib/server-fns";

export const Route = createFileRoute("/q/$token")({
  loader: async ({ params }) => {
    const data = await getPublicQuoteByTokenFn({ data: { token: params.token } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.business?.name
          ? `Painting Quote — ${loaderData.business.name}`
          : "Painting & Decorating Proposal",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PublicHomeownerQuotePage,
});

function formatRoomMeta(item, businessSettings) {
  const parts = [];
  if (Number(item.length_m) > 0 && Number(item.width_m) > 0) {
    parts.push(`${fmtMetric(item.length_m)} × ${fmtMetric(item.width_m)} m`);
  } else if (Number(item.area_m2_spoken) > 0) {
    parts.push(`${fmtMetric(item.area_m2_spoken)} m²`);
  }
  if (Number(item.stud_m) > 0) {
    parts.push(`stud ${fmtMetric(item.stud_m)} m`);
  }
  const metrics = formatSurfaceMetricsList(item, businessSettings);
  if (metrics) parts.push(metrics);
  parts.push(`${item.coats || 2} ${Number(item.coats) === 1 ? "coat" : "coats"}`);
  if (item.prep && item.prep !== "standard") {
    parts.push(PREP_LABELS[item.prep] || item.prep);
  }
  return parts.join(" · ");
}

function PublicHomeownerQuotePage() {
  const { isSample, business, quote, items, photos, isOwnerViewing } =
    Route.useLoaderData();
  const router = useRouter();
  const runRecordView = useServerFn(recordPublicQuoteViewFn);
  const runRespond = useServerFn(respondToPublicQuoteFn);

  const [tickedOptionalIds, setTickedOptionalIds] = useState(
    () => quote.selected_optional_ids || []
  );
  const [localStatus, setLocalStatus] = useState(quote.status);
  const [localAcceptedName, setLocalAcceptedName] = useState(
    quote.accepted_name || ""
  );
  const [localAcceptedAt, setLocalAcceptedAt] = useState(
    quote.accepted_at || null
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLocalStatus(quote.status);
    setLocalAcceptedName(quote.accepted_name || "");
    setLocalAcceptedAt(quote.accepted_at || null);
  }, [quote.status, quote.accepted_name, quote.accepted_at]);

  useEffect(() => {
    if (isSample || isOwnerViewing) return;
    runRecordView({ data: { token: quote.public_token } }).catch(() => {});
  }, [isSample, isOwnerViewing, quote.public_token, runRecordView]);

  const currency = business?.currency || "NZD";
  const businessSettings = {
    default_stud_m: business?.default_stud_m ?? 2.4,
    openings_pct: business?.openings_pct ?? 10,
  };

  const baseItems = items.filter((it) => !it.optional);
  const optionalItems = items.filter((it) => it.optional);

  const totals = calculateQuoteTotals({
    items,
    tickedOptionalIds,
    minCharge: business?.min_charge || 0,
    gstRate: business?.gst_rate ?? 0.15,
    pricesIncludeGst: Boolean(business?.prices_include_gst),
    depositPct: quote.deposit_pct || 0,
  });

  function toggleOptional(itemId) {
    if (localStatus === "accepted") return;
    setTickedOptionalIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  }

  async function handleAccept({ acceptedName, agreed }) {
    setSubmitting(true);
    try {
      const res = await runRespond({
        data: {
          token: quote.public_token,
          action: "accept",
          acceptedName,
          agreed,
          selectedOptionalIds: tickedOptionalIds,
        },
      });
      setLocalStatus("accepted");
      setLocalAcceptedName(res.accepted_name || acceptedName);
      setLocalAcceptedAt(res.accepted_at || new Date().toISOString());
      if (!isSample) await router.invalidate();
      toast.success("Quote accepted. Thank you!");
    } catch (err) {
      toast.error(err?.message || "Could not accept quote");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecline() {
    setSubmitting(true);
    try {
      await runRespond({
        data: {
          token: quote.public_token,
          action: "decline",
          selectedOptionalIds: tickedOptionalIds,
        },
      });
      setLocalStatus("declined");
      if (!isSample) await router.invalidate();
      toast("Quote marked declined");
    } catch (err) {
      toast.error(err?.message || "Could not update quote");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {isSample && (
        <div className="no-print border-b border-border bg-accent px-4 py-2.5 text-center text-[14px] font-medium text-accent-foreground">
          <span>
            Sample Ponsonby quote — tick the optional hallway ceiling below to watch 15% GST and the total update live.{" "}
          </span>
          <Link to="/app" className="font-bold underline">
            Start your 7-day free trial
          </Link>
        </div>
      )}

      <main className="mx-auto max-w-2xl space-y-6 px-4 pb-16 pt-6 sm:px-5 sm:pt-10">
        {/* Company Branding Header */}
        <section className="print-card apple-surface flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-border bg-card p-5">
          <div className="flex items-center gap-3.5">
            {business?.logo_url ? (
              <Image
                src={business.logo_url}
                alt={business.name}
                className="h-14 w-14 rounded-2xl border border-border object-cover"
              />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <PaintRoller className="h-5 w-5" />
              </span>
            )}
            <div>
              <h1 className="text-[22px] font-bold tracking-[-0.02em] text-foreground">
                {business?.name}
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-muted-foreground">
                {business?.phone && (
                  <a
                    href={`tel:${business.phone}`}
                    className="inline-flex items-center gap-1.5 hover:text-foreground"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span>{business.phone}</span>
                  </a>
                )}
                {business?.gst_number && <span>GST {business.gst_number}</span>}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="no-print flex min-h-[44px] items-center gap-2 rounded-xl border border-border bg-background px-3.5 text-[14px] font-semibold text-foreground hover:bg-secondary"
          >
            <Printer className="h-4 w-4" />
            <span>Print / PDF</span>
          </button>
        </section>

        {/* Client & Property Card */}
        <section className="print-card apple-surface rounded-[20px] border border-border bg-card p-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
            Painting specification prepared for
          </p>
          <p className="mt-1 text-[20px] font-bold text-foreground">
            {quote.client_name || "Homeowner"}
          </p>
          {quote.address && (
            <p className="mt-1 flex items-center gap-1.5 text-[15px] text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>{quote.address}</span>
            </p>
          )}
          {quote.notes && (
            <p className="mt-3 border-t border-border pt-3 text-[15px] text-muted-foreground">
              {quote.notes}
            </p>
          )}
        </section>

        {/* Room Photos (with optional spot pin only if set) */}
        {photos.filter((p) => p.url).length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[19px] font-bold tracking-[-0.015em] text-foreground">
              Room &amp; elevation photos
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {photos
                .filter((p) => p.url)
                .map((photo, idx) => {
                  const hasPin = photo.pin_x != null && photo.pin_y != null;
                  const areaItem = items.find(
                    (it) =>
                      it.id === photo.item_id ||
                      (!it.is_optional_split && it.area_number === photo.area_number)
                  );
                  return (
                    <div
                      key={photo.id || idx}
                      className="print-card apple-surface relative aspect-[16/11] overflow-hidden rounded-[20px] border border-border bg-zinc-900"
                    >
                      <Image
                        src={photo.url}
                        alt={areaItem?.name || `Area ${photo.area_number || idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute left-3 top-3 rounded-lg bg-black/65 px-2.5 py-1 text-[12px] font-semibold text-white backdrop-blur-md">
                        {areaItem?.name || `Room ${photo.area_number || idx + 1}`}
                      </span>
                      {hasPin && (
                        <span
                          style={{
                            left: `${photo.pin_x * 100}%`,
                            top: `${photo.pin_y * 100}%`,
                          }}
                          className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-primary text-[13px] font-bold text-white shadow-md"
                        >
                          {photo.area_number || idx + 1}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        {/* Base Rooms & Areas */}
        <section className="space-y-3">
          <h2 className="text-[19px] font-bold tracking-[-0.015em] text-foreground">
            Scope of painting work
          </h2>
          {baseItems.map((item) => (
            <div
              key={item.id}
              className="print-card apple-surface rounded-[20px] border border-border bg-card p-4 sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-6 min-w-[24px] shrink-0 items-center justify-center rounded-full bg-primary px-2 text-[12px] font-bold text-primary-foreground">
                    {item.area_number}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[17px] font-semibold text-foreground">
                        {item.name || `Area ${item.area_number}`}
                      </h3>
                      {item.colour && (
                        <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[12px] font-medium text-foreground">
                          {item.colour}
                        </span>
                      )}
                    </div>
                    <p className="tabular-money mt-0.5 text-[13px] font-medium text-muted-foreground">
                      {formatRoomMeta(item, businessSettings)}
                    </p>
                    <p className="mt-2 text-[15px] leading-[1.48] text-muted-foreground">
                      {item.customer_description}
                    </p>
                  </div>
                </div>
                <span className="tabular-money shrink-0 text-[18px] font-bold text-foreground">
                  {item.price != null ? formatMoney(item.price, currency) : "TBC"}
                </span>
              </div>
            </div>
          ))}
        </section>

        {/* Optional Extras */}
        {optionalItems.length > 0 && (
          <section className="space-y-3">
            <div>
              <h2 className="text-[19px] font-bold tracking-[-0.015em] text-foreground">
                Optional extras
              </h2>
              <p className="text-[14px] text-muted-foreground">
                Tick any optional areas you would like included in your job
              </p>
            </div>

            {optionalItems.map((item) => {
              const checked = tickedOptionalIds.includes(item.id);
              return (
                <label
                  key={item.id}
                  className={`print-card apple-surface flex cursor-pointer items-start justify-between gap-3 rounded-[20px] border p-4 transition-colors sm:p-5 ${
                    checked
                      ? "border-primary bg-accent/45"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      disabled={localStatus === "accepted"}
                      checked={checked}
                      onChange={() => toggleOptional(item.id)}
                      className="mt-1 h-5 w-5 shrink-0 accent-[hsl(var(--primary))]"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[17px] font-semibold text-foreground">
                          {item.name}
                        </p>
                        {item.colour && (
                          <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[12px] text-foreground">
                            {item.colour}
                          </span>
                        )}
                      </div>
                      <p className="tabular-money mt-0.5 text-[13px] text-muted-foreground">
                        {formatRoomMeta(item, businessSettings)}
                      </p>
                      <p className="mt-1.5 text-[15px] text-muted-foreground">
                        {item.customer_description}
                      </p>
                    </div>
                  </div>
                  <span className="tabular-money shrink-0 text-[18px] font-bold text-foreground">
                    {item.price != null
                      ? `+${formatMoney(item.price, currency)}`
                      : "TBC"}
                  </span>
                </label>
              );
            })}
          </section>
        )}

        {/* GST & Totals Breakdown */}
        <section className="print-card apple-surface space-y-2 rounded-[20px] border border-border bg-card p-5">
          {!totals.pricesIncludeGst && (
            <div className="flex justify-between text-[15px] text-muted-foreground">
              <span>Base scope</span>
              <span className="tabular-money">
                {formatMoney(totals.baseItemsSum, currency)}
              </span>
            </div>
          )}
          {optionalItems.length > 0 && (
            <div className="flex justify-between text-[15px] text-muted-foreground">
              <span>Selected optional extras</span>
              <span className="tabular-money">
                {formatMoney(totals.optionalSum, currency)}
              </span>
            </div>
          )}
          {totals.minChargeApplied && (
            <div className="flex justify-between text-[15px] text-muted-foreground">
              <span>Minimum crew charge adjustment</span>
              <span className="tabular-money">
                +{formatMoney(totals.minChargeDelta, currency)}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-2.5 text-[15px] text-muted-foreground">
            <span>Subtotal (excl. GST)</span>
            <span className="tabular-money font-medium text-foreground">
              {formatMoney(totals.subtotalExclGst, currency)}
            </span>
          </div>
          <div className="flex justify-between text-[15px] text-muted-foreground">
            <span>GST ({totals.gstPctLabel}%)</span>
            <span className="tabular-money font-medium text-foreground">
              {formatMoney(totals.gstAmount, currency)}
            </span>
          </div>
          <div className="flex justify-between border-t border-border pt-3 text-[20px] font-bold text-foreground">
            <span>Total (incl. GST)</span>
            <span className="tabular-money">
              {formatMoney(totals.totalInclGst, currency)}
            </span>
          </div>
          {Number(quote.deposit_pct) > 0 && (
            <div className="flex justify-between text-[15px] font-semibold text-primary">
              <span>Deposit upon booking ({quote.deposit_pct}%)</span>
              <span className="tabular-money">
                {formatMoney(totals.depositAmount, currency)}
              </span>
            </div>
          )}
        </section>

        {/* Terms */}
        {business?.terms && (
          <section className="print-card apple-surface rounded-[20px] border border-border bg-card p-5">
            <h2 className="text-[15px] font-semibold text-foreground">
              Terms &amp; workmanship notes
            </h2>
            <p className="mt-1.5 text-[14px] leading-[1.52] text-muted-foreground">
              {business.terms}
            </p>
          </section>
        )}
      </main>

      <HomeownerAcceptBar
        status={localStatus}
        acceptedName={localAcceptedName}
        acceptedAt={localAcceptedAt}
        total={totals.totalInclGst}
        depositPct={quote.deposit_pct || 0}
        depositAmount={totals.depositAmount}
        currency={currency}
        onAccept={handleAccept}
        onDecline={handleDecline}
        submitting={submitting}
      />
    </div>
  );
}