import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

/**
 * Phone-first sheet that rises from the bottom edge. The body scrolls on its
 * own so a long sheet never pushes its footer off screen; the footer clears the
 * home indicator. Set dismissible={false} while work is in flight.
 */
export default function BottomSheet({ open, onOpenChange, title, description, children, footer, dismissible = true }) {
  const block = (e) => !dismissible && e.preventDefault();
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => (dismissible || next) && onOpenChange(next)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/25 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onInteractOutside={block}
          onEscapeKeyDown={block}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-[28px] bg-background outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:bottom-4 sm:rounded-[28px]"
        >
          <div className="flex shrink-0 items-start gap-3 px-5 pb-3 pt-5">
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="text-[20px] font-semibold tracking-[-0.025em] text-foreground">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className={description ? "mt-0.5 text-[14px] leading-snug text-muted-foreground" : "sr-only"}>
                {description || title}
              </DialogPrimitive.Description>
            </div>
            {dismissible && (
              <DialogPrimitive.Close
                aria-label="Close"
                className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </DialogPrimitive.Close>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
          {footer ? <div className="safe-bottom shrink-0 border-t border-border px-5 pt-3">{footer}</div> : <div className="safe-bottom shrink-0" />}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}