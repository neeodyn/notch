import { Link } from "@tanstack/react-router";
import { Check, ArrowUpRight } from "lucide-react";

export default function PremiumPlan({ title, description, price, interval, featured, features, cta }) {
  return (
    <article className={`premium-plan glass-panel ${featured ? "premium-plan-featured" : ""}`}>
      <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold tracking-tight">{title}</h3>{featured && <span className="rounded-full bg-primary/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">First 20 customers</span>}</div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <div className="my-8 flex items-baseline gap-1"><span className="text-xs font-medium text-muted-foreground">NZ</span><span className="tabular-money text-5xl font-semibold tracking-[-0.06em]">${price}</span><span className="ml-1 text-sm text-muted-foreground">/ {interval === "yearly" ? "year" : "month"}</span></div>
      <ul className="space-y-4 border-t border-border/60 pt-6">{features.map((feature) => <li key={feature} className="flex items-start gap-3 text-sm"><Check size={15} className="mt-0.5 shrink-0 text-primary" />{feature}</li>)}</ul>
      <Link to="/app" className={`${featured ? "premium-button" : "premium-button-secondary"} mt-9 w-full justify-center`}>{cta}<ArrowUpRight size={16} /></Link>
    </article>
  );
}