import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

export default function PricingPlansSection() {
  const [interval, setInterval] = useState("monthly");

  const foundingPrice = interval === "yearly" ? "NZ$390" : "NZ$39";
  const standardPrice = interval === "yearly" ? "NZ$490" : "NZ$49";
  const unitLabel = interval === "yearly" ? "/year" : "/month";

  return (
    <section id="pricing" className="mt-16">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.05em] text-primary">
            Simple NZD pricing
          </p>
          <h2 className="mt-1 font-display text-[30px] font-bold tracking-[-0.024em] text-foreground sm:text-[34px]">
            Pays for itself on the first room you win
          </h2>
          <p className="mt-1 text-[16px] text-muted-foreground">
            7 days free from your first sent quote. Existing client quote links never expire.
          </p>
        </div>

        <div className="inline-flex self-start rounded-2xl border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setInterval("monthly")}
            className={`min-h-[44px] rounded-xl px-4 text-[14px] font-semibold transition-colors ${
              interval === "monthly"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setInterval("yearly")}
            className={`min-h-[44px] rounded-xl px-4 text-[14px] font-semibold transition-colors ${
              interval === "yearly"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Yearly (2 months free)
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {/* Founding Plan */}
        <div className="apple-surface flex flex-col justify-between rounded-[22px] border-2 border-primary bg-card p-6">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[20px] font-bold text-foreground">Founding Painter</h3>
              <span className="rounded-full bg-accent px-3 py-1 text-[12px] font-semibold text-accent-foreground">
                First 20 customers
              </span>
            </div>
            <p className="mt-1.5 text-[15px] text-muted-foreground">
              Locked-in founding rate for early NZ painting and decorating crews.
            </p>

            <div className="mt-5 flex items-baseline gap-1">
              <span className="tabular-money text-[38px] font-bold tracking-[-0.03em] text-foreground">
                {foundingPrice}
              </span>
              <span className="text-[15px] text-muted-foreground">{unitLabel}</span>
            </div>

            <ul className="mt-5 space-y-2.5 text-[15px] text-foreground">
              <li className="flex items-center gap-2.5">
                <Check className="h-4 w-4 shrink-0 text-primary" />
                <span>Unlimited house walks, room photos, and voice edits</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="h-4 w-4 shrink-0 text-primary" />
                <span>Automatic wall, ceiling, and skirting m² + 15% GST</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="h-4 w-4 shrink-0 text-primary" />
                <span>Branded homeowner links with optional extras &amp; e-sign</span>
              </li>
            </ul>
          </div>

          <Link
            to="/app"
            className="mt-6 flex h-14 items-center justify-center rounded-2xl bg-primary text-[17px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Claim Founding 7-day trial
          </Link>
        </div>

        {/* Standard Plan */}
        <div className="apple-surface flex flex-col justify-between rounded-[22px] border border-border bg-card p-6">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[20px] font-bold text-foreground">Standard</h3>
              <span className="rounded-full bg-secondary px-3 py-1 text-[12px] font-semibold text-muted-foreground">
                Full access
              </span>
            </div>
            <p className="mt-1.5 text-[15px] text-muted-foreground">
              Everything a solo painter or small residential crew needs on site.
            </p>

            <div className="mt-5 flex items-baseline gap-1">
              <span className="tabular-money text-[38px] font-bold tracking-[-0.03em] text-foreground">
                {standardPrice}
              </span>
              <span className="text-[15px] text-muted-foreground">{unitLabel}</span>
            </div>

            <ul className="mt-5 space-y-2.5 text-[15px] text-foreground">
              <li className="flex items-center gap-2.5">
                <Check className="h-4 w-4 shrink-0 text-primary" />
                <span>Custom m², door, window, coat &amp; prep rate card</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="h-4 w-4 shrink-0 text-primary" />
                <span>Instant homeowner view &amp; acceptance email alerts</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="h-4 w-4 shrink-0 text-primary" />
                <span>48-hour SMS follow-ups and print-ready PDF proposals</span>
              </li>
            </ul>
          </div>

          <Link
            to="/app"
            className="mt-6 flex h-14 items-center justify-center rounded-2xl border border-border bg-background text-[17px] font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            Start 7-day free trial
          </Link>
        </div>
      </div>
    </section>
  );
}