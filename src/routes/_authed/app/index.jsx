import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import AppDock from "@/components/notch/AppDock";
import QuoteListCard from "@/components/notch/QuoteListCard";
import WorkspaceHeader from "@/components/notch/WorkspaceHeader";
import WorkspaceOverview from "@/components/notch/WorkspaceOverview";
import { createDraftQuote, generateFollowUpFn, getAppBootstrap } from "@/lib/server-fns";
import { parseUtc } from "@/lib/legal";

export const Route = createFileRoute("/_authed/app/")({
  head: () => ({ meta: [{ title: "Quotes — Notch" }] }),
  loader: () => getAppBootstrap(),
  component: QuotesListScreen,
});

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "viewed", label: "Viewed" },
  { key: "accepted", label: "Accepted" },
  { key: "declined", label: "Declined" },
];

function QuotesListScreen() {
  const { business, quotes } = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const runCreateDraft = useServerFn(createDraftQuote);
  const runFollowUp = useServerFn(generateFollowUpFn);

  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    setNowMs(Date.now());
  }, []);

  const sevenDaysAgoMs = nowMs ? nowMs - 7 * 24 * 60 * 60 * 1000 : 0;
  const thisWeekQuotes = nowMs
    ? quotes.filter((q) => parseUtc(q.created_date) >= sevenDaysAgoMs)
    : quotes;

  const weekSentCount = thisWeekQuotes.filter((q) =>
    ["sent", "viewed", "accepted"].includes(q.status)
  ).length;
  const weekAcceptedTotal = thisWeekQuotes
    .filter((q) => q.status === "accepted")
    .reduce((sum, q) => sum + (Number(q.total_incl_gst ?? q.total) || 0), 0);

  const needle = searchQuery.trim().toLowerCase();
  const filteredQuotes = quotes.filter((q) => {
    const matchesStatus = statusFilter === "all" || q.status === statusFilter;
    if (!matchesStatus) return false;
    if (!needle) return true;
    return (
      (q.client_name || "").toLowerCase().includes(needle) ||
      (q.address || "").toLowerCase().includes(needle)
    );
  });

  const currency = business?.currency || "NZD";

  async function handleNewQuote() {
    if (creating) return;
    setCreating(true);
    try {
      const { quote } = await runCreateDraft();
      await navigate({
        to: "/app/q/$id/capture",
        params: { id: quote.id },
      });
    } catch (err) {
      toast.error(err?.message || "Could not start new quote");
      setCreating(false);
    }
  }

  async function handleFollowUp(quoteId) {
    const res = await runFollowUp({ data: { quoteId } });
    await router.invalidate();
    return res;
  }

  return (
    <div className="min-h-dvh bg-background pb-32 text-foreground">
      <WorkspaceHeader businessName={business?.name} />

      <main className="mx-auto mt-5 max-w-2xl space-y-5 px-4 sm:px-5">
        {!business && (
          <div className="apple-surface flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-border bg-card p-4">
            <div>
              <p className="text-[16px] font-semibold text-foreground">
                Set up your painting business header
              </p>
              <p className="text-[14px] text-muted-foreground">
                Add your GST number, default stud height, and optional m² rate card—or skip straight to quoting.
              </p>
            </div>
            <Link
              to="/app/setup"
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-secondary px-4 text-[14px] font-semibold text-foreground"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Set up</span>
            </Link>
          </div>
        )}

        <WorkspaceOverview walked={thisWeekQuotes.length} sent={weekSentCount} acceptedTotal={weekAcceptedTotal} currency={currency} />

        {/* Instant Search */}
        {quotes.length > 0 && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search client or street…"
              className="h-11 w-full rounded-full border border-transparent bg-card pl-10 pr-4 text-[15px] text-foreground placeholder:text-muted-foreground"
            />
          </div>
        )}

        {/* Status filter pills */}
        {quotes.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTER_TABS.map((tab) => {
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`min-h-[44px] shrink-0 rounded-full px-4 text-[14px] font-semibold transition-colors duration-200 ${
                  active
                    ? "bg-foreground text-background"
                    : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        )}

        {/* Quotes list */}
        <section className="space-y-3">
          {filteredQuotes.length === 0 ? (
            <div className="apple-surface rounded-[20px] border border-border bg-card px-5 py-12 text-center">
              <p className="text-[18px] font-semibold text-foreground">
                {statusFilter === "all" && !needle
                  ? "Ready for your first house walk"
                  : "No matching quotes"}
              </p>
              <p className="mx-auto mt-1.5 max-w-sm text-[15px] text-muted-foreground">
                {statusFilter === "all" && !needle
                  ? "Tap New quote below, walk each room speaking dimensions, coats, and prices, and snap photos as you go."
                  : "Nothing matches that search or filter. Try another name, street or status."}
              </p>
            </div>
          ) : (
            filteredQuotes.map((quote) => (
              <QuoteListCard
                key={quote.id}
                quote={quote}
                currency={currency}
                nowMs={nowMs}
                onFollowUp={handleFollowUp}
              />
            ))
          )}
        </section>
      </main>

      <AppDock>
        <button
          type="button"
          disabled={creating}
          onClick={handleNewQuote}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[17px] font-semibold text-primary-foreground transition-opacity duration-200 hover:opacity-90 disabled:opacity-60"
        >
          <Plus className="h-5 w-5" />
          <span>{creating ? "Opening camera…" : "New quote"}</span>
        </button>
      </AppDock>
    </div>
  );
}