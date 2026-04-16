import { useState, useRef } from "react";
import { Check, ChevronRight, Trash2 } from "lucide-react";

interface SwipeToDeleteTaskRowProps {
  task: { id: string; name: string; completed_at: string | null };
  onDelete: () => void;
  onClick: () => void;
}

export function SwipeToDeleteTaskRow({ task, onDelete, onClick }: SwipeToDeleteTaskRowProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);

  const THRESHOLD = 80;
  const isCompleted = !!task.completed_at;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const diff = startX.current - e.touches[0].clientX;
    setOffsetX(diff > 0 ? Math.min(diff, 100) : 0);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    setOffsetX(offsetX >= THRESHOLD ? 100 : 0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX;
    setIsSwiping(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSwiping) return;
    const diff = startX.current - e.clientX;
    setOffsetX(diff > 0 ? Math.min(diff, 100) : 0);
  };

  const handleMouseUp = () => {
    setIsSwiping(false);
    setOffsetX(offsetX >= THRESHOLD ? 100 : 0);
  };

  return (
    <div className="relative overflow-hidden">
      <div
        className="absolute right-0 top-0 bottom-0 w-24 flex items-center justify-center bg-destructive cursor-pointer"
        onClick={onDelete}
      >
        <Trash2 className="h-6 w-6 text-white" />
      </div>

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
        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
          isCompleted ? "bg-foreground" : "bg-muted"
        }`}>
          <Check className={`h-3.5 w-3.5 ${isCompleted ? "text-background" : "text-muted-foreground"}`} />
        </div>
        <span className={`text-sm flex-1 ${isCompleted ? "text-foreground" : "font-medium"}`}>
          {task.name}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>
    </div>
  );
}