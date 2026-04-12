import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Trash2, Timer, Dumbbell } from "lucide-react";
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
            <div className="w-24 h-24 mb-6 text-muted-foreground/30">
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <rect x="30" y="15" width="40" height="8" rx="4" fill="currentColor" />
                <rect x="38" y="23" width="24" height="50" rx="4" fill="currentColor" />
                <rect x="30" y="73" width="40" height="8" rx="4" fill="currentColor" />
                <rect x="42" y="8" width="16" height="7" rx="3" fill="currentColor" />
                <rect x="42" y="81" width="16" height="7" rx="3" fill="currentColor" />
                <circle cx="50" cy="48" r="8" stroke="currentColor" strokeWidth="3" fill="none" />
              </svg>
            </div>
            <p className="text-base font-medium text-muted-foreground mb-3">
              No exercises added yet
            </p>
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
      <div className="flex items-center justify-around border-t border-border bg-background px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
        <button
          onClick={handleDeleteSelected}
          className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Trash2 className="h-5 w-5" />
          <span className="text-[10px] font-medium">Delete</span>
        </button>
        <button
          onClick={handleAddRest}
          className="flex flex-col items-center gap-1 text-yellow-500 hover:text-yellow-600 transition-colors"
        >
          <Timer className="h-5 w-5" />
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
