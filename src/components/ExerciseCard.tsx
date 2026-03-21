import { Video, Play, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ExerciseCardProps {
  exercise: {
    id: string;
    name: string;
    description?: string | null;
    muscle_group?: string | null;
    equipment?: string | null;
    category?: string | null;
    video_url?: string | null;
    image_url?: string | null;
    exercise_type?: string | null;
    duration_minutes?: number | null;
  };
  onEdit?: (exercise: any) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export function ExerciseCard({
  exercise,
  onEdit,
  selectionMode,
  isSelected,
  onToggleSelect,
}: ExerciseCardProps) {
  const initials = exercise.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleClick = () => {
    if (selectionMode) {
      onToggleSelect?.();
    } else {
      onEdit?.(exercise);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group relative rounded-xl border bg-card overflow-hidden cursor-pointer transition-all hover:shadow-md hover:border-primary/30",
        isSelected && "ring-2 ring-primary border-primary",
        selectionMode && "select-none"
      )}
    >
      {/* Thumbnail / Fallback */}
      <div className="relative aspect-video bg-muted overflow-hidden">
        {exercise.image_url ? (
          <img
            src={exercise.image_url}
            alt={exercise.name}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : exercise.video_url ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
            <Play className="h-10 w-10 text-muted-foreground/40" />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/15">
            <span className="text-2xl font-bold text-primary/30 font-heading">
              {initials}
            </span>
          </div>
        )}

        {/* Video badge */}
        {exercise.video_url && (
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            <Video className="h-3 w-3" />
            {exercise.duration_minutes ? `${exercise.duration_minutes}m` : "Video"}
          </div>
        )}

        {/* Selection checkbox */}
        {selectionMode && (
          <div
            className={cn(
              "absolute top-2 left-2 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors",
              isSelected
                ? "bg-primary border-primary text-primary-foreground"
                : "bg-background/80 border-muted-foreground/40 backdrop-blur-sm"
            )}
          >
            {isSelected && <Check className="h-3.5 w-3.5" />}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-1.5">
        <h3 className="font-semibold text-sm leading-tight line-clamp-2">
          {exercise.name}
        </h3>
        <div className="flex flex-wrap gap-1">
          {exercise.muscle_group && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {exercise.muscle_group}
            </Badge>
          )}
          {exercise.equipment && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {exercise.equipment}
            </Badge>
          )}
          {exercise.exercise_type === "follow_along" && (
            <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-0">
              Follow Along
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
