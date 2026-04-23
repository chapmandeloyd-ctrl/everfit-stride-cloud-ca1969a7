import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Play, CalendarPlus, Bookmark } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartNow: () => void;
  onSaveForLater: () => void;
  onSchedule: () => void;
}

const OPTIONS = [
  { key: "start", label: "Start Now", description: "Begin the workout right now", icon: Play },
  { key: "schedule", label: "Schedule for a Day", description: "Pick a date on your calendar", icon: CalendarPlus },
  { key: "save", label: "Save for Later", description: "Keep it in your library", icon: Bookmark },
] as const;

export function PostBuildChoiceSheet({
  open, onOpenChange, onStartNow, onSaveForLater, onSchedule,
}: Props) {
  const handle = (key: typeof OPTIONS[number]["key"]) => {
    onOpenChange(false);
    if (key === "start") onStartNow();
    else if (key === "save") onSaveForLater();
    else onSchedule();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-8 pt-2">
        <SheetHeader className="px-6 pb-3">
          <SheetTitle className="text-center text-base font-semibold">
            What would you like to do?
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.key}
                onClick={() => handle(opt.key)}
                className="flex items-center gap-4 px-6 py-4 text-left hover:bg-muted/50 active:bg-muted transition-colors border-b border-border last:border-b-0"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}