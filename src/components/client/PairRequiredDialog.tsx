import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

/**
 * Pair-required dialog: protocol + keto type are a single program.
 * Used after the user activates ONE side. Two variants:
 *   - mode="needs-other": user only has the side they just set; prompt them to pick the other.
 *   - mode="ready-paired": the other side is already set; confirm pairing → land on combined preview.
 */
interface PairRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What the user just activated. */
  justSet: "protocol" | "keto";
  /** Name of the just-set item (e.g. "MED — Mediterranean Ketogenic Diet"). */
  justSetLabel: string;
  /** When mode === 'ready-paired', label of the existing other side. */
  otherLabel?: string | null;
  /** Tells the dialog which copy + buttons to render. */
  mode: "needs-other" | "ready-paired";
  /** "Pick the other side" button (chooser route) — needs-other only. */
  onPickOther: () => void;
  /** "View paired program" button — ready-paired only. */
  onViewPaired: () => void;
  /** Save-for-later (close + stay on this page). Always available. */
  onSaveForLater: () => void;
}

export function PairRequiredDialog({
  open,
  onOpenChange,
  justSet,
  justSetLabel,
  otherLabel,
  mode,
  onPickOther,
  onViewPaired,
  onSaveForLater,
}: PairRequiredDialogProps) {
  const otherKind = justSet === "protocol" ? "Keto Type" : "Fasting Protocol";

  if (mode === "ready-paired") {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pair confirmed</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-foreground">{justSetLabel}</span> will pair with your active{" "}
              <span className="font-semibold text-foreground">{otherLabel}</span>.
              <br />
              <br />
              View your complete plan now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onSaveForLater}>Just browsing for now</AlertDialogCancel>
            <AlertDialogAction onClick={onViewPaired}>View Complete Plan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>One more step</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-semibold text-foreground">{justSetLabel}</span> is set. To begin, you also need to pick a{" "}
            <span className="font-semibold text-foreground">{otherKind}</span> — the protocol and keto type run together as one program.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onSaveForLater}>Just browsing for now</AlertDialogCancel>
          <AlertDialogAction onClick={onPickOther}>Pick {otherKind}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}