import { Link } from "@tanstack/react-router";
import { ArrowRight, Camera, CheckCircle2, FileText, Mic, ShieldCheck } from "lucide-react";
import LandingHeader from "@/components/landing/LandingHeader";
import WalkthroughDemo from "@/components/landing/WalkthroughDemo";
import { SAMPLE_QUOTE_TOKEN } from "@/components/sample/sampleQuoteData";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Notch — Talk the yard. Send the quote." },
      {
        name: "description",
        content: "Mobile quoting for tree service crews. Walk the yard talking, snap each tree, and text a homeowner link.",
      },
    ],
  }),
  component: LandingPage,
});

import { createFileRoute } from "@tanstack/react-router";

const FIELD_STEPS = [
  {
    icon: Camera,
    title: "1. Walk and snap",
    body: "Tap New quote once. Keep talking as you walk the property and tap Snap on each tree without leaving the camera.",
  },
  {
    icon: Mic,
    title: "2. Tap or say a fix",
    body: "Your spoken prices stay exact, photos land on the right tree, and anything uncertain is flagged in amber. Say a quick change or tap any number.",
  },
  {
    icon: FileText,
    title: "3. Send and get signed",
    body: "Text the link before you pull out of the driveway. Homeowners tick optional stump grinding, see the live total, and type their name to accept.",
  },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingHeader />

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-5 sm:pt-16">
        {/* Hero */}
        <section className="max-w-2xl">
          <p className="text-[14px] font-semibold uppercase tracking-[0.05em] text-primary">
            Built for tree service owners
          </p>
          <h1 className="mt-2 font-display text-[38px] font-bold leading-[1.08] tracking-[-0.028em] text-foreground sm:text-[52px]">
            Talk the yard.
            <br />
            Send the quote.
          </h1>
          <p className="mt-4 text-[18px] leading-[1.5] text-muted-foreground sm:text-[20px]">
            One walk around the property fills the client card, every tree, numbered yard photos, optional stump work,
            and your exact spoken prices—ready for the homeowner to open and accept on their phone.
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
              <span>Open sample homeowner quote</span>
            </Link>
          </div>

          <p className="mt-3 text-[14px] text-muted-foreground">
            7 days free from your first sent quote. No card required to walk a yard.
          </p>
        </section>

        {/* 40s Interactive Walkthrough */}
        <div className="mt-10 sm:mt-12">
          <WalkthroughDemo />
        </div>

        {/* Three-step breakdown */}
        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          {FIELD_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="rounded-[18px] border border-border bg-card p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-[19px] font-semibold tracking-[-0.015em] text-foreground">{step.title}</h2>
                <p className="mt-2 text-[16px] leading-[1.48] text-muted-foreground">{step.body}</p>
              </div>
            );
          })}
        </section>

        {/* Field guarantees */}
        <section className="mt-10 rounded-[20px] border border-border bg-card p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div className="space-y-2">
              <h2 className="text-[22px] font-bold tracking-[-0.02em] text-foreground">
                Made for bright sun, wood chippers, and spotty cell bars
              </h2>
              <div className="grid gap-2 pt-1 text-[16px] text-muted-foreground sm:grid-cols-2">
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  <span>Saves audio and photos on your phone first</span>
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  <span>Never guesses a price you did not say</span>
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  <span>Works in English, Spanish, or mixed crew talk</span>
                </p>
                <p className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                  <span>Signed acceptance records name, time, and IP</span>
                </p>
              </div>
            </div>

            <Link
              to="/app"
              className="flex h-14 shrink-0 items-center justify-center rounded-2xl bg-primary px-6 text-[17px] font-semibold text-primary-foreground transition-opacity duration-200 hover:opacity-90"
            >
              New quote
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}