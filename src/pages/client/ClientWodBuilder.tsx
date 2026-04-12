import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Trash2, Timer, Dumbbell, Hand, Layers, Repeat } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WodExercise {
  id: string;
  exercise_id: string;
  exercise_name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
}

export default function ClientWodBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workoutType = searchParams.get("type") || "regular";
  const { user } = useAuth();

  const [exercises, setExercises] = useState<WodExercise[]>([]);
  const [showExerciseLibrary, setShowExerciseLibrary] = useState(false);
  const [saving, setSaving] = useState(false);

  const typeLabel =
    workoutType === "circuit" ? "Circuit" : workoutType === "interval" ? "Interval" : "Regular";

  const handleSave = async () => {
    if (exercises.length === 0) {
      toast.error("Add at least one exercise");
      return;
    }
    // TODO: Save WOD to database
    toast.success("Workout saved!");
    navigate(-1);
  };

  const handleAddRest = () => {
    const restItem: WodExercise = {
      id: crypto.randomUUID(),
      exercise_id: "rest",
      exercise_name: "Rest",
      sets: 1,
      reps: "60s",
      rest_seconds: 60,
    };
    setExercises((prev) => [...prev, restItem]);
  };

  const handleDeleteSelected = () => {
    // For now just remove last exercise
    if (exercises.length > 0) {
      setExercises((prev) => prev.slice(0, -1));
    }
  };

  const handleInsertExercise = () => {
    setShowExerciseLibrary(true);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
        <button
          onClick={() => navigate(-1)}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <span className="text-sm font-semibold text-foreground">Today</span>
        <button
          onClick={handleSave}
          disabled={saving || exercises.length === 0}
          className="text-sm font-semibold text-primary disabled:opacity-40 transition-opacity"
        >
          Save
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto">
        {exercises.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full px-6">
            <Dumbbell className="w-20 h-20 text-muted-foreground/25" strokeWidth={1.2} />
            <button
              onClick={handleInsertExercise}
              className="text-sm font-semibold text-primary uppercase tracking-wide"
            >
              + INSERT EXERCISE
            </button>
          </div>
        ) : (
          /* Exercise list */
          <div className="p-4 space-y-3">
            {exercises.map((ex, i) => (
              <div
                key={ex.id}
                className="bg-card border border-border rounded-lg p-3 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  {ex.exercise_id === "rest" ? (
                    <Timer className="h-4 w-4" />
                  ) : (
                    <Dumbbell className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ex.exercise_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ex.sets} × {ex.reps}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="flex items-center justify-around border-t border-border bg-background px-2 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
        <button
          disabled
          className="flex flex-col items-center gap-1 text-muted-foreground/30 cursor-not-allowed"
        >
          <Layers className="h-5 w-5" />
          <span className="text-[10px] font-medium">Superset</span>
        </button>
        <button
          disabled
          className="flex flex-col items-center gap-1 text-muted-foreground/30 cursor-not-allowed"
        >
          <Repeat className="h-5 w-5" />
          <span className="text-[10px] font-medium">Circuit</span>
        </button>
        <button
          onClick={handleDeleteSelected}
          className="flex flex-col items-center gap-1 text-primary hover:text-primary/80 transition-colors"
        >
          <Trash2 className="h-5 w-5" />
          <span className="text-[10px] font-medium">Delete</span>
        </button>
        <button
          onClick={handleAddRest}
          className="flex flex-col items-center gap-1 text-primary hover:text-primary/80 transition-colors"
        >
          <Hand className="h-5 w-5" />
          <span className="text-[10px] font-medium">Rest</span>
        </button>
        <button
          onClick={handleInsertExercise}
          className="flex flex-col items-center gap-1 text-primary hover:text-primary/80 transition-colors"
        >
          <Dumbbell className="h-5 w-5" />
          <span className="text-[10px] font-medium">Insert</span>
        </button>
      </div>

      {/* TODO: Exercise library sheet */}
    </div>
  );
}
