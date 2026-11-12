import { Check } from "lucide-react";

const INTERVALS = [
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" },
];

function planTitle(business) {
  if (business?.plan === "founding") return "Founding Painter Plan";
  if (business?.plan === "active") return "Standard Plan";
  if (business?.trial_expired) return "7-day free trial ended";
  return `Free trial · ${business?.trial_days_left ?? 7} days left`;
}

function PlanOption({ name, price, note, badge, featured }) {
  return (
    <div className={`rounded-2xl bg-background p-4 ${featured ? "border-2 border-primary" : "border border-border"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[15px] font-bold text-foreground">{name}</span>
        {badge && <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">{badge}</span>}
      </div>
      <p className="tabular-money mt-1.5 text-[26px] font-bold text-foreground">{price}</p>
      <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span>{note}</span>
      </p>
    </div>
  );
}

export default function PlanCard({ business, billingInterval, onIntervalChange }) {
  const isPaid = business?.plan === "active" || business?.plan === "founding";
  const yearly = billingInterval === "yearly";
  return (
    <div className="space-y-4 rounded-[20px] bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[19px] font-bold text-foreground">{planTitle(business)}</p>
        <div className="inline-flex rounded-xl border border-border bg-background p-1" role="group" aria-label="Billing interval">
          {INTERVALS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              aria-pressed={billingInterval === opt.key}
              onClick={() => onIntervalChange(opt.key)}
              className={`min-h-[40px] rounded-lg px-3.5 text-[13px] font-semibold ${billingInterval === opt.key ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      {!isPaid && (
        <div className="grid gap-3 sm:grid-cols-2">
          <PlanOption featured name="Founding Painter" badge="First 20" price={yearly ? "NZ$390/yr" : "NZ$39/mo"} note="Founding rate locked for life" />
          <PlanOption name="Standard" price={yearly ? "NZ$490/yr" : "NZ$49/mo"} note="Unlimited quotes & SMS follow-ups" />
        </div>
      )}
      <p className="text-[13px] leading-snug text-muted-foreground">
        {isPaid
          ? "Unlimited house walks and homeowner quote links active."
          : "7 days free from your first sent quote. Live billing switches on once checkout is connected; quotes you've already sent stay open for your clients."}
      </p>
    </div>
  );
}