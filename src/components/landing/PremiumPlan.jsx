import { Link } from "@tanstack/react-router";

export default function PremiumPlan({ title, description, price, interval, featured, features, cta }) {
  return (
    <article className={`premium-plan ${featured ? "premium-plan-featured" : ""}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><h3 className="font-display text-[30px] font-semibold leading-tight tracking-[-0.035em]">{title}</h3>{featured && <span className="text-[13px] font-semibold text-primary">First 20 customers</span>}</div>
      <p className="mt-3 text-muted-foreground">{description}</p>
      <p className="tabular-money mb-8 mt-9 flex items-baseline gap-2"><span className="font-display text-[72px] font-semibold leading-none tracking-[-0.055em]">${price}</span><span className="text-[15px] text-muted-foreground">NZD / {interval === "yearly" ? "year" : "month"}</span></p>
      <ul className="plan-features mb-9 text-[15px]">{features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
      <Link to="/app" className={`${featured ? "premium-button" : "premium-button-secondary"} mt-auto w-full`}>{cta}</Link>
    </article>
  );
}