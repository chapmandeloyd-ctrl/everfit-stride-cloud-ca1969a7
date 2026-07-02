import { Button } from "@/components/ui/button";
import { Clock, Lock, AlertTriangle } from "lucide-react";
import { useScheduledFastGate } from "@/hooks/useScheduledFastGate";

interface Props {
  onStart: () => void;
  size?: "sm" | "default";
  className?: string;
}

/**
 * Wraps the Start Fast CTA with scheduled-start enforcement.
 * When early → button is disabled and shows a live countdown.
 * When late  → button stays enabled but shows a soft warning.
 * When enforcement is off or day is a fast/refeed → renders plain Start Fast.
 */
export function StartFastGate({ onStart, size = "default", className }: Props) {
  const gate = useScheduledFastGate();

  if (gate.state === "early") {
    return (
      <div className={className}>
        <Button
          className="w-full h-12 text-base"
          size={size}
          variant="secondary"
          disabled
        >
          <Lock className="h-4 w-4 mr-2" />
          Fast starts in {gate.countdownLabel}
        </Button>
        {gate.scheduledLabel && (
          <p className="text-[11px] text-muted-foreground text-center mt-1.5">
            Scheduled start · {gate.scheduledLabel}
          </p>
        )}
      </div>
    );
  }

  if (gate.state === "late") {
    return (
      <div className={className}>
        <Button
          className="w-full h-12 text-base bg-amber-500 hover:bg-amber-600 text-white"
          size={size}
          onClick={onStart}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Start Fast — {gate.countdownLabel} late
        </Button>
        {gate.scheduledLabel && (
          <p className="text-[11px] text-muted-foreground text-center mt-1.5">
            Scheduled start · {gate.scheduledLabel}
          </p>
        )}
      </div>
    );
  }

  // "ready" | "off" | "n/a" → plain Start Fast
  return (
    <Button
      className={`w-full h-12 text-base ${className ?? ""}`}
      size={size}
      onClick={onStart}
    >
      <Clock className="h-4 w-4 mr-2" /> Start Fast
    </Button>
  );
}
