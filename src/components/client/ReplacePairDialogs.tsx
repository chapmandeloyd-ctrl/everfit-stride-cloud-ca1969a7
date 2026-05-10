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
 * Step 1 — Replacement confirmation.
 * Shown when a user taps Set/Start on a protocol or keto type that
 * differs from the one they currently have active.
 */
export function ConfirmReplacementDialog({
  open,
  onOpenChange,
  kind,
  newLabel,
  currentLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: "protocol" | "keto";
  newLabel: string;
  currentLabel: string | null;
  onConfirm: () => void;
}) {
  const noun = kind === "protocol" ? "fasting protocol" : "keto type";
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Make this your new {noun}?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-semibold text-foreground">{newLabel}</span> will replace{" "}
            {currentLabel ? (
              <>
                your current{" "}
                <span className="font-semibold text-foreground">{currentLabel}</span>
              </>
            ) : (
              <>your current {noun}</>
            )}
            .
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Just browsing</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Yes, make it new</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Step 2 — Cross-sell the other half.
 * Shown after a successful replacement when the user already has the
 * other side of the pair assigned. "No" lands them on Complete Plan.
 */
export function CrossSellOtherSideDialog({
  open,
  onOpenChange,
  justChanged,
  newLabel,
  onChangeOther,
  onViewProgram,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  justChanged: "protocol" | "keto";
  newLabel: string;
  onChangeOther: () => void;
  onViewProgram: () => void;
}) {
  const otherNoun = justChanged === "protocol" ? "keto type" : "fasting protocol";
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Updated to {newLabel}</AlertDialogTitle>
          <AlertDialogDescription>
            Would you like to change your {otherNoun} too?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onViewProgram}>No, view program</AlertDialogCancel>
          <AlertDialogAction onClick={onChangeOther}>Yes, change it</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}