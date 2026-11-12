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

export default function UnsavedChangesDialog({
  blocker,
  title = "Leave without saving?",
  description = "Your changes on this screen haven't been saved yet.",
}) {
  return (
    <AlertDialog
      open={blocker.status === "blocked"}
      onOpenChange={(open) => !open && blocker.reset?.()}
    >
      <AlertDialogContent className="max-w-sm rounded-[22px] p-6">
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle className="text-[19px] font-semibold tracking-[-0.02em]">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-[15px] leading-snug">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-2 gap-2 sm:space-x-0">
          <AlertDialogCancel onClick={() => blocker.reset?.()} className="mt-0 h-12 rounded-2xl text-[15px]">
            Keep editing
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => blocker.proceed?.()}
            className="h-12 rounded-2xl bg-destructive text-[15px] text-destructive-foreground hover:bg-destructive/90"
          >
            Discard changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}