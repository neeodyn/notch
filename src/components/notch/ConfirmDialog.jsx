import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * A decision to make before something that can't be taken back. The safe choice
 * (cancel) is focused first, so a stray tap never confirms.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <AlertDialogContent className="w-[calc(100%-2rem)] max-w-sm gap-5 rounded-[24px] border-border p-6 sm:rounded-[24px]">
        <AlertDialogHeader className="space-y-1.5 text-left">
          <AlertDialogTitle className="text-[19px] font-semibold tracking-[-0.02em] text-foreground">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[15px] leading-snug text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:justify-start sm:space-x-0">
          <AlertDialogAction
            onClick={onConfirm}
            className={`h-12 w-full rounded-2xl text-[16px] font-semibold ${
              destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""
            }`}
          >
            {confirmLabel}
          </AlertDialogAction>
          <AlertDialogCancel className="mt-0 h-12 w-full rounded-2xl border-transparent bg-secondary text-[16px] font-semibold text-foreground hover:bg-secondary/80 hover:text-foreground">
            {cancelLabel}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}