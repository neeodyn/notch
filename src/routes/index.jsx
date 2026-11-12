import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  FileCheck,
  Mic,
  Ruler,
  ShieldCheck,
} from "lucide-react";
import LandingHeader from "@/components/landing/LandingHeader";
import WalkthroughDemo from "@/components/landing/WalkthroughDemo";
import PricingPlansSection from "@/components/landing/PricingPlansSection";
import { SAMPLE_QUOTE_TOKEN } from "@/components/sample/sampleQuoteData";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Notch — Walk the house. Send the quote." },
      {
        name: "description",
        content:
          "Mobile quoting for New Zealand painters and decorators. Speak room dimensions, snap photos, and send a GST-ready quote link.",
      },
    ],
  }),
  component: LandingPage,
});

const WORKFLOW_CARDS = [
  {
    icon: Camera,
    title: "1. Walk through talking",
    body: "Tap New quote once. Speak room sizes in metres ('five by four, stud two-four, walls and ceiling, two coats') and tap Snap in each room.",
  },
  {
    icon: Ruler,
    title: "2. Exact m² & spoken prices",
    body: "Wall, ceiling, and skirting m² calculate automatically. Your spoken prices stay exact, or your rate card prices rooms you didn't price out loud.",
  },
  {
    icon: Mic,
    title: "3. Fix by tap or voice",
    body: "Say 'hallway is four fifty' or tap a coat pill. Only that figure updates, highlighted in green with one-tap Undo.",
  },
  {
    icon: FileCheck,
    title: "4. Homeowner ticks & signs",
    body: "Text the proposal before leaving the street. Clients tick optional ceilings or feature walls, see 15% GST update live, and type their name to accept.",
  },
];

function LandingPage() {
  const [heroIncludeCeiling, setHeroIncludeCeiling] = useState(false);
  const excl = heroIncludeCeiling ? 1690 : 1500;
  const gst = Math.round(excl * 0.15 * 100) / 100;
  const incl = Math.round((excl + gst) * 100) / 100;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingHeader />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
        {/* Architectural Split Hero */}
        <section className="grid items-center gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-primary">
              For New Zealand painters &amp; decorators
            </p>
            <h1 className="mt-2.5 font-display text-[40px] font-bold leading-[1.06] tracking-[-0.03em] text-foreground sm:text-[56px]">
              Walk the house.
              <br />
              Send the quote.
            </h1>
            <p className="mt-4 max-w-xl text-[18px] leading-[1.52] text-muted-foreground sm:text-[19px]">
              Stop typing up room measurements at 9pm. Walk the job once speaking dimensions, coats, prep, and prices
              while snapping each room—then send a clean, GST-ready link the homeowner can sign on their phone.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/app"
                className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-7 text-[17px] font-semibold text-primary-foreground transition-opacity duration-200 hover:opacity-90"
              >
                <span>Start 7-day free trial</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/q/$token"
                params={{ token: SAMPLE_QUOTE_TOKEN }}
                className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-6 text-[17px] font-semibold text-foreground transition-colors duration-200 hover:bg-secondary"
              >
                <span>Open Ponsonby sample quote</span>
              </Link>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-muted-foreground">
              <span>7 days free from first sent quote</span>
              <span>·</span>
              <span>Resene, Dulux &amp; Wattyl ready</span>
              <span>·</span>
              <span>Founding NZ$39/mo</span>
            </div>
          </div>

          {/* Live Interactive Hero Spec Card */}
          <div className="lg:col-span-5">
            <div className="apple-surface rounded-[22px] border border-border bg-card p-5 sm:p-6">
              <div className="flex items-start justify-between border-b border-border pb-3.5">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-primary">
                    Kauri Coast Painters · GST 128-492-017
                  </p>
                  <p className="mt-0.5 text-[18px] font-bold text-foreground">
                    14 Kauri Street, Ponsonby
                  </p>
                  <p className="text-[14px] text-muted-foreground">Prepared for Sarah Miller</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[12px] font-semibold text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300">
                  Live preview
                </span>
              </div>

              <div className="mt-3.5 space-y-2.5">
                <div className="rounded-2xl border border-border bg-background p-3.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[15px] font-semibold text-foreground">
                      Lounge · 5 × 4 m · stud 2.4
                    </p>
                    <span className="tabular-money text-[16px] font-bold text-foreground">
                      $1,100
                    </span>
                  </div>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    walls 38.9 m², ceiling 20 m² · 2 coats · Resene Alabaster
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-background p-3.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[15px] font-semibold text-foreground">
                      Hallway · 8 × 1.2 m · stud 2.4
                    </p>
                    <span className="tabular-money text-[16px] font-bold text-foreground">
                      $400
                    </span>
                  </div>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    walls 39.7 m² · 2 coats · Resene Half Black White
                  </p>
                </div>

                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-accent/50 p-3.5 transition-colors">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={heroIncludeCeiling}
                      onChange={(e) => setHeroIncludeCeiling(e.target.checked)}
                      className="h-5 w-5 accent-[hsl(var(--primary))]"
                    />
                    <div>
                      <p className="text-[14px] font-semibold text-foreground">
                        Optional: Hallway Ceiling
                      </p>
                      <p className="text-[12px] text-muted-foreground">
                        ceiling 9.6 m² · 2 coats (tap to test)
                      </p>
                    </div>
                  </div>
                  <span className="tabular-money text-[15px] font-bold text-foreground">
                    +$190
                  </span>
                </label>
              </div>

              <div className="mt-4 space-y-1 border-t border-border pt-3.5 text-[14px]">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal (excl. GST)</span>
                  <span className="tabular-money">${excl.toLocaleString("en-NZ")}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>GST (15%)</span>
                  <span className="tabular-money">
                    ${gst.toLocaleString("en-NZ", { minimumFractionDigits: gst % 1 ? 2 : 0 })}
                  </span>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-[15px] font-semibold text-foreground">
                    Total (incl. GST)
                  </span>
                  <span className="tabular-money text-[22px] font-bold text-foreground">
                    NZ${incl.toLocaleString("en-NZ", { minimumFractionDigits: incl % 1 ? 2 : 0 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 40s Interactive Walkthrough */}
        <div className="mt-14">
          <WalkthroughDemo />
        </div>

        {/* Four-Step Workflow */}
        <section className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WORKFLOW_CARDS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="apple-surface rounded-[20px] border border-border bg-card p-5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-[18px] font-semibold tracking-[-0.015em] text-foreground">
                  {step.title}
                </h2>
                <p className="mt-1.5 text-[15px] leading-[1.5] text-muted-foreground">
                  {step.body}
                </p>
              </div>
            );
          })}
        </section>

        {/* Trade-Specific Trust Guarantees */}
        <section className="apple-surface mt-12 rounded-[22px] border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="space-y-3">
              <h2 className="text-[24px] font-bold tracking-[-0.022em] text-foreground">
                Designed around how Kiwi painters actually price a house
              </h2>
              <div className="grid gap-2.5 pt-1 text-[15px] text-muted-foreground sm:grid-cols-2">
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  <span>Interior walls deduct window &amp; door openings automatically</span>
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  <span>Never invents a price—flags spoken outliers below 0.5× or above 2×</span>
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  <span>Saves recordings on your phone first when cell reception drops</span>
                </p>
                <p className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                  <span>E-signature records client name, timestamp, and IP</span>
                </p>
              </div>
            </div>

            <Link
              to="/app"
              className="flex h-14 shrink-0 items-center justify-center rounded-2xl bg-primary px-7 text-[17px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Start quoting free
            </Link>
          </div>
        </section>

        {/* Pricing Section */}
        <PricingPlansSection />
      </main>
    </div>
  );
}