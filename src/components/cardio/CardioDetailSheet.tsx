import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CheckCircle2 } from "lucide-react";
import { getIconComponent } from "./cardioActivities";

interface CardioDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: {
    activity_type: string;
    duration_seconds: number;
    distance_miles?: number | null;
    calories?: number | null;
    completed_at?: string | null;
  };
}

function formatDetailTime(totalSeconds: number) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${hrs} h ${mins} m ${secs} s`;
}

export function CardioDetailSheet({ open, onOpenChange, session }: CardioDetailSheetProps) {
  const activityLabel = session.activity_type.replace(/_/g, " ");
  const Icon = getIconComponent(session.activity_type);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-10">
        <SheetHeader className="sr-only">
          <SheetTitle>Activity Detail</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col items-center pt-8 pb-4">
          <div className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center mb-5">
            <CheckCircle2 className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-foreground capitalize mb-1">{activityLabel}</h2>
          <p className="text-muted-foreground text-sm mb-8">Completed</p>

          <div className="w-full max-w-sm space-y-0 divide-y divide-border">
            <div className="flex justify-between py-3">
              <span className="text-sm font-medium text-foreground">Time</span>
              <span className="text-sm text-muted-foreground">{formatDetailTime(session.duration_seconds || 0)}</span>
            </div>
            {session.distance_miles && (
              <div className="flex justify-between py-3">
                <span className="text-sm font-medium text-foreground">Distance</span>
                <span className="text-sm text-muted-foreground">{session.distance_miles} mi</span>
              </div>
            )}
            {session.calories && (
              <div className="flex justify-between py-3">
                <span className="text-sm font-medium text-foreground">Total calories</span>
                <span className="text-sm text-muted-foreground">{Math.round(session.calories)} cal</span>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
