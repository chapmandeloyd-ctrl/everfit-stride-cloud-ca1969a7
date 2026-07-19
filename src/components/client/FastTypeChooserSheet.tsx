import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * First step when a client taps "Choose Your Protocol" on the dashboard.
 * Splits self-guided fasting into Long Fast vs Intermittent Fast.
 */
export function FastTypeChooserSheet({ open, onOpenChange }: Props) {
  const navigate = useNavigate();

  const go = (path: string) => {
    onOpenChange(false);
    // small delay so sheet close animation doesn't jank the route change
    setTimeout(() => navigate(path), 120);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl border-t border-border/60 bg-background p-0">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/40">
          <SheetTitle className="text-center text-xl font-bold">Long or Intermittent?</SheetTitle>
        </SheetHeader>

        <div className="px-5 pt-5 pb-8 space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            What type of fast do you want to start?
          </p>

          <button
            type="button"
            onClick={() => go("/client/long-fast")}
            className="w-full flex items-center justify-between rounded-2xl bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground transition-colors px-5 py-4 text-left shadow-lg shadow-primary/20 border border-primary/40"
          >
            <div>
              <div className="text-lg font-bold leading-tight">Long Fast</div>
              <div className="text-xs opacity-80 mt-0.5">For extended fasting (e.g. 1–5 days)</div>
            </div>
            <ChevronRight className="h-5 w-5 opacity-90 shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => go("/client/choose-protocol")}
            className="w-full flex items-center justify-between rounded-2xl bg-card hover:bg-card/80 active:bg-card/70 text-foreground transition-colors px-5 py-4 text-left shadow-lg border border-primary/40"
          >
            <div>
              <div className="text-lg font-bold leading-tight">Intermittent Fast</div>
              <div className="text-xs text-muted-foreground mt-0.5">For daily patterns like 16:8 or OMAD</div>
            </div>
            <ChevronRight className="h-5 w-5 text-primary shrink-0" />
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}