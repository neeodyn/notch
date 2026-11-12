import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShieldCheck } from "lucide-react";

export default function UpgradeTrialSheet({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[20px] border-border bg-card p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="text-[22px] font-bold tracking-[-0.02em] text-foreground">
            Your 7-day free trial has ended
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-[16px] leading-[1.48] text-muted-foreground">
            Every quote link you already sent stays live so homeowners can still view and accept. Upgrade to Notch
            Active to send new quotes.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-2.5 rounded-2xl bg-background p-4 text-[15px] text-foreground">
          <p className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
            <span>Unlimited yard walks, photos, and homeowner quote links</span>
          </p>
          <p className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
            <span>Instant view and signed-acceptance email notifications</span>
          </p>
          <p className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
            <span>One-tap 48-hour text follow-ups</span>
          </p>
        </div>

        <div className="mt-5 space-y-2.5">
          <Link
            to="/app/settings"
            onClick={() => onOpenChange(false)}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-primary px-5 text-[17px] font-semibold text-primary-foreground"
          >
            Open billing settings
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