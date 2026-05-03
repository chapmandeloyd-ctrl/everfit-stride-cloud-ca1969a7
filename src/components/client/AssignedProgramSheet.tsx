import { Sheet, SheetContent } from "@/components/ui/sheet";
import { X } from "lucide-react";

interface AssignedProgramSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** kept for backwards compat; not used now */
  canStart?: boolean;
}

/**
 * Fullscreen popup that shows the FULL assigned program preview
 * (Part 1 Protocol + Part 2 Keto Type + meal timeline) inline,
 * by embedding the existing /client/complete-plan page in an iframe.
 * No navigation, no duplicate code paths.
 */
export function AssignedProgramSheet({ open, onOpenChange }: AssignedProgramSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[100dvh] w-full max-w-full p-0 border-0 bg-black gap-0"
      >
        <button
          aria-label="Close"
          onClick={() => onOpenChange(false)}
          className="absolute top-3 right-3 z-50 h-9 w-9 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition"
        >
          <X className="h-5 w-5" />
        </button>
        {open && (
          <iframe
            src="/client/complete-plan?embed=1"
            className="w-full h-full border-0"
            title="Your Assigned Program"
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
