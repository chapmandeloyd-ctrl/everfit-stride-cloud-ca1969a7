import { useState, useRef } from "react";
import { Check, ChevronRight, Clock, Trash2 } from "lucide-react";

interface SwipeToDeleteWorkoutRowProps {
  workout: any;
  onDelete: () => void;
  onClick: () => void;
}

export function SwipeToDeleteWorkoutRow({ workout, onDelete, onClick }: SwipeToDeleteWorkoutRowProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);

  const THRESHOLD = 80;
  const isInProgress = workout.status === "in_progress";

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = startX.current;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    currentX.current = e.touches[0].clientX;
    const diff = startX.current - currentX.current;
    setOffsetX(diff > 0 ? Math.min(diff, 100) : 0);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    setOffsetX(offsetX >= THRESHOLD ? 100 : 0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX;
    currentX.current = startX.current;
    setIsSwiping(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSwiping) return;
    currentX.current = e.clientX;
    const diff = startX.current - currentX.current;
    setOffsetX(diff > 0 ? Math.min(diff, 100) : 0);
  };

  const handleMouseUp = () => {
    setIsSwiping(false);
    setOffsetX(offsetX >= THRESHOLD ? 100 : 0);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Delete button behind */}
      <div
        className="absolute right-0 top-0 bottom-0 w-24 flex items-center justify-center bg-destructive cursor-pointer"
        onClick={onDelete}
      >
        <Trash2 className="h-6 w-6 text-white" />
      </div>

      {/* Foreground row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer bg-card relative z-10 transition-transform"
        style={{ transform: `translateX(-${offsetX}px)`, transition: isSwiping ? "none" : "transform 0.2s ease-out" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => { if (offsetX < 5) onClick(); }}
      >
        <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${isInProgress ? "bg-amber-500" : "bg-primary"}`}>
          {isInProgress ? (
            <Clock className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />
          ) : (
            <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{workout.workout_plan?.name || "Workout"}</p>
          <p className="text-xs text-muted-foreground">
            {isInProgress
              ? `In Progress · ${workout.completion_percentage || 0}% Complete`
              : workout.is_partial
              ? `Tracked · ${workout.completion_percentage || ""}${workout.completion_percentage ? "% " : ""}Complete`
              : "Completed"}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>
    </div>
  );
}
