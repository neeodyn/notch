import { useEffect, useState } from "react";
import { Link, createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, PaintRoller, Phone, Printer } from "lucide-react";
import { toast } from "sonner";
import { Image } from "@/components/ui/image";
import HomeownerAcceptBar from "@/components/notch/HomeownerAcceptBar";
import ProposalHeader from "@/components/proposal/ProposalHeader";
import ProposalClient from "@/components/proposal/ProposalClient";
import ProposalGallery from "@/components/proposal/ProposalGallery";
import ProposalScopeItem from "@/components/proposal/ProposalScopeItem";
import ProposalTotals from "@/components/proposal/ProposalTotals";
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
    <div className="premium-proposal min-h-screen bg-background text-foreground">
      {isSample && (
        <div className="proposal-sample-ribbon no-print px-4 py-3 text-center text-[13px] text-muted-foreground">
          <span>
            Sample Ponsonby quote — tick the optional hallway ceiling below to watch 15% GST and the total update live.{" "}
          </span>
          <Link to="/app" className="font-medium hover:underline">
            Start your 7-day free trial
          </Link>
        </div>
      )}

      <main className="proposal-document mx-auto max-w-3xl space-y-6 px-4 pb-16 pt-6 sm:px-5 sm:pt-10">
        <ProposalHeader business={business} />

        <ProposalClient quote={quote} />

        <ProposalGallery photos={photos} items={items} />

        <section className="proposal-scope-section">
          <div className="proposal-section-label"><span>02</span><h2>Scope of painting work</h2></div>
          <div className="proposal-scope-surface">{baseItems.map((item) => <ProposalScopeItem key={item.id} item={item} meta={formatRoomMeta(item, businessSettings)} currency={currency} />)}</div>
        </section>

        {optionalItems.length > 0 && (
          <section className="proposal-option-section">
            <div className="proposal-section-label"><span>03</span><h2>Make it yours</h2></div>
            <p className="mb-5 text-sm text-muted-foreground">Choose any optional areas. Your total updates as you go.</p>
            <div className="space-y-3">{optionalItems.map((item) => <ProposalScopeItem key={item.id} optional item={item} meta={formatRoomMeta(item, businessSettings)} currency={currency} checked={tickedOptionalIds.includes(item.id)} disabled={localStatus === "accepted"} onToggle={() => toggleOptional(item.id)} />)}</div>
          </section>
        )}

        <ProposalTotals totals={totals} currency={currency} quote={quote} hasOptional={optionalItems.length > 0} />

        {/* Terms */}
        {business?.terms && (
          <section className="proposal-terms print-card">
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