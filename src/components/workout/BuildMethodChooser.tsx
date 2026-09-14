import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Sparkles, Layers } from "lucide-react";

interface BuildMethodChooserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChooseAI: () => void;
  onChooseManual: () => void;
}

export function BuildMethodChooser({
  open,
  onOpenChange,
  onChooseAI,
  onChooseManual,
}: BuildMethodChooserProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">How do you want to build this workout?</DialogTitle>
          <DialogDescription>
            Generate one with AI or build it block-by-block yourself
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2 pt-2">
          <button
            onClick={onChooseAI}
            className="text-left p-5 rounded-2xl border border-border bg-card transition-all hover:border-primary hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <span className="h-12 w-12 rounded-2xl flex items-center justify-center mb-3 bg-purple-500/15 border border-purple-500/40">
              <Sparkles className="h-6 w-6 text-purple-500" />
            </span>
            <span className="block text-base font-semibold text-foreground">AI Builder</span>
            <span className="block text-xs text-muted-foreground mt-1.5 leading-snug">
              Describe what you want and let AI generate a full structured workout
            </span>
          </button>

          <button
            onClick={onChooseManual}
            className="text-left p-5 rounded-2xl border border-border bg-card transition-all hover:border-primary hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <span className="h-12 w-12 rounded-2xl flex items-center justify-center mb-3 bg-blue-500/15 border border-blue-500/40">
              <Layers className="h-6 w-6 text-blue-500" />
            </span>
            <span className="block text-base font-semibold text-foreground">Build Your Own</span>
            <span className="block text-xs text-muted-foreground mt-1.5 leading-snug">
              Manually add warm-ups, working sets, supersets, circuits, and more
            </span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
