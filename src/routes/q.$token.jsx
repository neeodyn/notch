import { useEffect, useState } from "react";
import { Link, createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, MapPin, PaintRoller, Phone, Printer } from "lucide-react";
import { toast } from "sonner";
import { Image } from "@/components/ui/image";
import StartLink from "@/components/landing/StartLink";
import HomeownerAcceptBar from "@/components/notch/HomeownerAcceptBar";
import ProposalHeader from "@/components/proposal/ProposalHeader";
import ProposalClient from "@/components/proposal/ProposalClient";
import ProposalGallery from "@/components/proposal/ProposalGallery";
import ProposalScopeItem from "@/components/proposal/ProposalScopeItem";
import ProposalTotals from "@/components/proposal/ProposalTotals";
import ProposalTerms from "@/components/proposal/ProposalTerms";
import ProposalAcceptanceRecord from "@/components/proposal/ProposalAcceptanceRecord";
import { quoteReference } from "@/lib/legal";
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
    if (quote.status === "accepted" || quote.status === "declined") {
      setTickedOptionalIds(quote.selected_optional_ids || []);
    }
  }, [quote.status, quote.accepted_name, quote.accepted_at, quote.selected_optional_ids]);

  const isLocked = localStatus === "accepted" || localStatus === "declined";

  function applyResponse(res) {
    setLocalStatus(res.status);
    if (res.status === "accepted") {
      setLocalAcceptedName(res.accepted_name || "");
      setLocalAcceptedAt(res.accepted_at || null);
    }
    if (res.locked) {
      setTickedOptionalIds(res.selected_optional_ids || []);
      toast(
        res.status === "accepted"
          ? "This quote has already been accepted."
          : "This quote was declined. Contact your painter for a revised quote."
      );
    }
  }

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
    if (isLocked) return;
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
      applyResponse(res);
      if (!isSample) await router.invalidate();
      if (!res.locked) toast.success("Quote accepted. Thank you!");
    } catch (err) {
      toast.error(err?.message || "Could not accept quote");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecline() {
    setSubmitting(true);
    try {
      const res = await runRespond({
        data: {
          token: quote.public_token,
          action: "decline",
          selectedOptionalIds: tickedOptionalIds,
        },
      });
      applyResponse(res);
      if (!isSample) await router.invalidate();
      if (!res.locked) toast("Quote declined");
    } catch (err) {
      toast.error(err?.message || "Could not update quote");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="premium-proposal min-h-screen bg-background text-foreground">
      {isSample && (
        <div className="proposal-sample-ribbon no-print">
          <Link to="/" aria-label="Back to Notch"><ChevronLeft size={18} />Notch</Link>
          <p>Sample quote. Try the optional extra below.</p>
          <StartLink>Start free trial</StartLink>
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
            <div className="space-y-3">{optionalItems.map((item) => <ProposalScopeItem key={item.id} optional item={item} meta={formatRoomMeta(item, businessSettings)} currency={currency} checked={tickedOptionalIds.includes(item.id)} disabled={isLocked} onToggle={() => toggleOptional(item.id)} />)}</div>
          </section>
        )}

        <ProposalTotals totals={totals} currency={currency} quote={quote} hasOptional={optionalItems.length > 0} />

        {localStatus === "accepted" && (
          <ProposalAcceptanceRecord
            name={localAcceptedName}
            acceptedAt={localAcceptedAt}
            total={totals.totalInclGst}
            currency={currency}
            reference={quoteReference(quote)}
          />
        )}

        <ProposalTerms terms={business?.terms} currency={currency} />
      </main>

      <HomeownerAcceptBar
        status={localStatus}
        acceptedName={localAcceptedName}
        acceptedAt={localAcceptedAt}
        total={totals.totalInclGst}
        depositPct={quote.deposit_pct || 0}
        depositAmount={totals.depositAmount}
        currency={currency}
        businessName={business?.name}
        onAccept={handleAccept}
        onDecline={handleDecline}
        submitting={submitting}
      />
    </div>
  );
}