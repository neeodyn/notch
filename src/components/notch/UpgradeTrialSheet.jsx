import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check } from "lucide-react";

export default function UpgradeTrialSheet({ open, onOpenChange }) {
  const [interval, setInterval] = useState("monthly");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-[22px] border-border bg-card p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="text-[22px] font-bold tracking-[-0.02em] text-foreground">
            Your 7-day free trial has ended
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-[15px] leading-[1.48] text-muted-foreground">
            Every quote link you already sent stays live for homeowners. Choose a plan to send new quotes.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3 inline-flex rounded-xl border border-border bg-background p-1">
          <button
            type="button"
            onClick={() => setInterval("monthly")}
            className={`min-h-[38px] rounded-lg px-3.5 text-[13px] font-semibold ${
              interval === "monthly"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setInterval("yearly")}
            className={`min-h-[38px] rounded-lg px-3.5 text-[13px] font-semibold ${
              interval === "yearly"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            }`}
          >
            Yearly (save 2 months)
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border-2 border-primary bg-background p-4">
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-bold text-foreground">Founding</span>
              <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
                First 20
              </span>
            </div>
            <p className="tabular-money mt-2 text-[26px] font-bold text-foreground">
              {interval === "yearly" ? "NZ$390/yr" : "NZ$39/mo"}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <Check className="h-3.5 w-3.5 text-primary" />
              <span>Locked rate for life</span>
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background p-4">
            <span className="text-[15px] font-bold text-foreground">Standard</span>
            <p className="tabular-money mt-2 text-[26px] font-bold text-foreground">
              {interval === "yearly" ? "NZ$490/yr" : "NZ$49/mo"}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <Check className="h-3.5 w-3.5 text-primary" />
              <span>Unlimited quotes &amp; SMS</span>
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <Link
            to="/app/settings"
            onClick={() => onOpenChange(false)}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-primary px-5 text-[17px] font-semibold text-primary-foreground"
          >
            Open plan &amp; billing settings
          </Link>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex min-h-[44px] w-full items-center justify-center rounded-xl text-[15px] font-medium text-muted-foreground hover:text-foreground"
          >
            Keep editing draft
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}