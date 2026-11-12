import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Settings, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import QuoteListCard from "@/components/notch/QuoteListCard";
import { createDraftQuote, generateFollowUpFn, getAppBootstrap } from "@/lib/server-fns";
import { formatMoney } from "@/lib/pricing";

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
  const [creating, setCreating] = useState(false);
  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    setNowMs(Date.now());
  }, []);

  const sevenDaysAgoMs = nowMs ? nowMs - 7 * 24 * 60 * 60 * 1000 : 0;
  const thisWeekQuotes = nowMs
    ? quotes.filter((q) => Date.parse(q.created_date || "") >= sevenDaysAgoMs)
    : quotes;

  const weekSentCount = thisWeekQuotes.filter((q) => ["sent", "viewed", "accepted"].includes(q.status)).length;
  const weekAcceptedTotal = thisWeekQuotes
    .filter((q) => q.status === "accepted")
    .reduce((sum, q) => sum + (Number(q.total) || 0), 0);

  const filteredQuotes =
    statusFilter === "all" ? quotes : quotes.filter((q) => q.status === statusFilter);

  const currency = business?.currency || "USD";

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
    <div className="min-h-screen bg-background pb-32 text-foreground">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-4 pt-6 sm:px-5">
        <div>
          {business?.name && (
            <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
              {business.name}
            </p>
          )}
          <h1 className="large-title text-foreground">Quotes</h1>
        </div>

        <Link
          to="/app/settings"
          aria-label="Settings"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-card border border-border text-foreground hover:bg-secondary"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </header>

      <main className="mx-auto mt-5 max-w-2xl space-y-5 px-4 sm:px-5">
        {/* Optional onboarding card if business profile hasn't been set yet */}
        {!business && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-border bg-card p-4">
            <div>
              <p className="text-[16px] font-semibold text-foreground">Set up your company header</p>
              <p className="text-[14px] text-muted-foreground">
                Add your crew name, phone, and optional price book—or jump straight into a quote.
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

        {/* This week summary strip */}
        <section aria-label="This week summary" className="grid grid-cols-3 gap-2.5 rounded-[18px] border border-border bg-card p-4">
          <div>
            <p className="text-[12px] font-medium text-muted-foreground">This week</p>
            <p className="tabular-money mt-0.5 text-[22px] font-bold text-foreground">{thisWeekQuotes.length}</p>
            <p className="text-[12px] text-muted-foreground">walked</p>
          </div>
          <div className="border-l border-border pl-3">
            <p className="text-[12px] font-medium text-muted-foreground">Sent out</p>
            <p className="tabular-money mt-0.5 text-[22px] font-bold text-foreground">{weekSentCount}</p>
            <p className="text-[12px] text-muted-foreground">proposals</p>
          </div>
          <div className="border-l border-border pl-3">
            <p className="text-[12px] font-medium text-muted-foreground">Accepted</p>
            <p className="tabular-money mt-0.5 text-[22px] font-bold text-primary">
              {formatMoney(weekAcceptedTotal, currency)}
            </p>
            <p className="text-[12px] text-muted-foreground">signed</p>
          </div>
        </section>

        {/* Status filter pills */}
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
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Quotes list */}
        <section className="space-y-3">
          {filteredQuotes.length === 0 ? (
            <div className="rounded-[18px] border border-border bg-card px-5 py-12 text-center">
              <p className="text-[18px] font-semibold text-foreground">
                {statusFilter === "all" ? "Ready for your first yard walk" : `No ${statusFilter} quotes`}
              </p>
              <p className="mx-auto mt-1.5 max-w-sm text-[15px] text-muted-foreground">
                Tap New quote below, walk the yard talking through each tree, and snap photos as you go.
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

      {/* Sticky bottom New Quote button */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 backdrop-blur-md safe-bottom">
        <div className="mx-auto max-w-2xl px-4 pt-3 sm:px-5">
          <button
            type="button"
            disabled={creating}
            onClick={handleNewQuote}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[17px] font-semibold text-primary-foreground transition-opacity duration-200 hover:opacity-90 disabled:opacity-60"
          >
            <Plus className="h-5 w-5" />
            <span>{creating ? "Opening camera…" : "New quote"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}