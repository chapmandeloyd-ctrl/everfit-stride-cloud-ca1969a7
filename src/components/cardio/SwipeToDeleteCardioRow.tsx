import { useState, useRef } from "react";
import { Check, ChevronRight, Trash2 } from "lucide-react";

interface SwipeToDeleteCardioRowProps {
  session: any;
  onDelete: () => void;
  onClick: () => void;
}

function formatCardioRowTime(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hrs}h ${remainMins}m ${secs}s`;
  }
  return `${mins}m ${secs}s`;
}

export function SwipeToDeleteCardioRow({ session, onDelete, onClick }: SwipeToDeleteCardioRowProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const rowRef = useRef<HTMLDivElement>(null);

  const THRESHOLD = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = startX.current;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    currentX.current = e.touches[0].clientX;
    const diff = startX.current - currentX.current;
    if (diff > 0) {
      setOffsetX(Math.min(diff, 100));
    } else {
      setOffsetX(0);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (offsetX >= THRESHOLD) {
      setOffsetX(100);
    } else {
      setOffsetX(0);
    }
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
    if (diff > 0) {
      setOffsetX(Math.min(diff, 100));
    } else {
      setOffsetX(0);
    }
  };

  const handleMouseUp = () => {
    setIsSwiping(false);
    if (offsetX >= THRESHOLD) {
      setOffsetX(100);
    } else {
      setOffsetX(0);
    }
  };

  return (
    <div className="relative overflow-hidden" ref={rowRef}>
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
        {/* Solid black circle with white check */}
        <div className="h-6 w-6 rounded-full bg-foreground flex items-center justify-center shrink-0">
          <Check className="h-3.5 w-3.5 text-background" strokeWidth={3} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold capitalize">{session.activity_type.replace(/_/g, " ")}</p>
          <p className="text-xs text-muted-foreground">
            Completed.{" "}
            {session.duration_seconds > 0 && (
              <>⏱ {formatCardioRowTime(session.duration_seconds)}</>
            )}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>
    </div>
  );
}
