import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FastingCardProps {
  protocolName?: string;
  isCoachAssigned?: boolean;
  status?: "ready" | "active" | "completed";
  onStartFast?: () => void;
}

export function FastingCard({
  protocolName = "Eat-Stop-Eat",
  isCoachAssigned = true,
  status = "ready",
  onStartFast,
}: FastingCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Fasting Protocol
          </p>
          {isCoachAssigned && (
            <Badge className="bg-primary/15 text-primary border-0 text-[10px] font-semibold px-2 py-0.5">
              Coach Assigned
            </Badge>
          )}
        </div>
        <h3 className="text-lg font-bold font-heading">{protocolName}</h3>
      </div>

      {/* Status */}
      <p className="text-sm text-muted-foreground text-center py-2">
        {status === "ready"
          ? "Ready to start your next fast"
          : status === "active"
            ? "Fast in progress..."
            : "Fast completed!"}
      </p>

      {/* Action */}
      {status === "ready" && (
        <Button
          onClick={onStartFast}
          className="w-full h-12 rounded-xl text-base font-semibold gap-2"
        >
          <Clock className="h-5 w-5" />
          Start Fast
        </Button>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Need a different plan? Message your coach.
      </p>
    </div>
  );
}
