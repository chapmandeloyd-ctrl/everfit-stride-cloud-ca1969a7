import { useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Trash2, Dumbbell, Hand, Layers, Repeat, GripVertical, Timer, X } from "lucide-react";
import { ExerciseLibrarySheet } from "@/components/workout/ExerciseLibrarySheet";
import { SetsSliderSheet } from "@/components/workout/SetsSliderSheet";
import { SetTargetSheet } from "@/components/workout/SetTargetSheet";
import { RestTimePickerSheet } from "@/components/workout/RestTimePickerSheet";

interface WodExercise {
  id: string;
  exercise_id: string;
  exercise_name: string;
  image_url: string | null;
  sets: number;
  reps: string;
  rest_seconds: number;
  selected: boolean;
  group_id: string | null;
}

interface ExerciseGroup {
  id: string;
  type: "circuit" | "superset";
  rounds: number;
  selected: boolean;
}

export default function ClientWodBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workoutType = searchParams.get("type") || "regular";

  const [exercises, setExercises] = useState<WodExercise[]>([]);
  const [showExerciseLibrary, setShowExerciseLibrary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDragHint, setShowDragHint] = useState(true);
  const [editingSetsId, setEditingSetsId] = useState<string | null>(null);
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [editingRestId, setEditingRestId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
    setOverIndex(index);
    isDragging.current = true;
  }, []);

  const handleDragOver = useCallback((index: number) => {
    if (isDragging.current && dragIndex !== null) {
      setOverIndex(index);
    }
  }, [dragIndex]);

  const handleDragEnd = useCallback(() => {
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      setExercises((prev) => {
        const updated = [...prev];
        const [moved] = updated.splice(dragIndex, 1);
        updated.splice(overIndex, 0, moved);
        return updated;
      });
    }
    setDragIndex(null);
    setOverIndex(null);
    isDragging.current = false;
  }, [dragIndex, overIndex]);

  const handleTouchStart = useCallback((e: React.TouchEvent, index: number) => {
    dragStartY.current = e.touches[0].clientY;
    longPressTimer.current = setTimeout(() => {
      handleDragStart(index);
    }, 400);
  }, [handleDragStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (longPressTimer.current && !isDragging.current) {
      const dy = Math.abs(e.touches[0].clientY - dragStartY.current);
      if (dy > 10) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
    if (!isDragging.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    const elements = itemRefs.current;
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        setOverIndex(i);
        break;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    handleDragEnd();
  }, [handleDragEnd]);

  const handleSave = async () => {
    if (exercises.length === 0) {
      toast.error("Add at least one exercise");
      return;
    }
    toast.success("Workout saved!");
    navigate(-1);
  };

  const handleAddRest = () => {
    const restItem: WodExercise = {
      id: crypto.randomUUID(),
      exercise_id: "rest",
      exercise_name: "Rest",
      image_url: null,
      sets: 1,
      reps: "60s",
      rest_seconds: 60,
      selected: false,
    };
    setExercises((prev) => [...prev, restItem]);
  };

  const handleDeleteSelected = () => {
    const hasSelected = exercises.some((e) => e.selected);
    if (hasSelected) {
      setExercises((prev) => prev.filter((e) => !e.selected));
    } else if (exercises.length > 0) {
      toast.error("Select exercises to delete first");
    }
  };

  const toggleSelect = (id: string) => {
    setExercises((prev) =>
      prev.map((e) => (e.id === id ? { ...e, selected: !e.selected } : e))
    );
  };

  const updateExerciseField = (id: string, field: keyof WodExercise, value: any) => {
    setExercises((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const handleInsertExercise = () => {
    setShowExerciseLibrary(true);
  };

  const selectedCount = exercises.filter((e) => e.selected).length;

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
          <div className="flex flex-col items-center justify-center h-full px-6 gap-4">
            <Dumbbell className="w-20 h-20 text-muted-foreground/25" strokeWidth={1.2} />
            <p className="text-base font-medium text-muted-foreground">
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
          <div className="px-3 pt-3 pb-4 space-y-0">
            {/* Drag hint tooltip */}
            {showDragHint && (
              <div className="relative mb-3 bg-primary text-primary-foreground rounded-xl px-4 py-3 flex items-start gap-3 shadow-lg">
                <GripVertical className="h-5 w-5 shrink-0 mt-0.5" />
                <p className="text-xs font-medium flex-1">
                  Tap and hold to unlock, then drag to rearrange exercises
                </p>
                <button
                  onClick={() => setShowDragHint(false)}
                  className="text-xs font-bold shrink-0 opacity-80 hover:opacity-100"
                >
                  Got it!
                </button>
                {/* Arrow pointing down */}
                <div className="absolute -bottom-2 right-8 w-4 h-4 bg-primary rotate-45" />
              </div>
            )}

            {/* Exercise cards */}
            {exercises.map((ex, index) => (
              <div
                key={ex.id}
                ref={(el) => { itemRefs.current[index] = el; }}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => { e.preventDefault(); handleDragOver(index); }}
                onDragEnd={handleDragEnd}
                onTouchStart={(e) => handleTouchStart(e, index)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className={`border-b border-border py-3 transition-all ${
                  ex.selected ? "bg-primary/5" : ""
                } ${dragIndex === index ? "opacity-50 scale-95" : ""} ${
                  overIndex === index && dragIndex !== null && dragIndex !== index
                    ? "border-t-2 border-t-primary"
                    : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelect(ex.id)}
                    className="shrink-0"
                  >
                    <div
                      className={`w-5 h-5 rounded border-[1.5px] flex items-center justify-center transition-colors ${
                        ex.selected
                          ? "bg-primary border-primary"
                          : "border-muted-foreground/30 bg-transparent"
                      }`}
                    >
                      {ex.selected && (
                        <svg className="h-3 w-3 text-primary-foreground" viewBox="0 0 14 14" fill="none">
                          <path d="M2 7l3.5 3.5L12 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </button>

                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                    {ex.exercise_id === "rest" ? (
                      <Timer className="h-6 w-6 text-muted-foreground/40" />
                    ) : ex.image_url ? (
                      <img src={ex.image_url} alt={ex.exercise_name} className="w-full h-full object-cover" />
                    ) : (
                      <Dumbbell className="h-6 w-6 text-muted-foreground/40" />
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {ex.exercise_name}
                    </p>
                  </div>

                  {/* Drag handle */}
                  <div className="shrink-0 text-muted-foreground/30 cursor-grab">
                    <GripVertical className="h-5 w-5" />
                  </div>
                </div>

                {/* Pill buttons row */}
                {ex.exercise_id !== "rest" && (
                  <div className="flex items-center gap-2 mt-2 ml-7 pl-1">
                    <button
                      onClick={() => setEditingSetsId(ex.id)}
                      className="px-3 py-1 rounded-full border border-border text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      {ex.sets} sets
                    </button>
                    <button
                      onClick={() => setEditingTargetId(ex.id)}
                      className="px-3 py-1 rounded-full border border-border text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      {ex.reps === "10" ? "Set Target" : ex.reps}
                    </button>
                    <button
                      onClick={() => setEditingRestId(ex.id)}
                      className="px-3 py-1 rounded-full border border-border text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <Hand className="h-3 w-3" />
                      {ex.rest_seconds > 0 ? (ex.rest_seconds >= 60 ? `${Math.floor(ex.rest_seconds / 60)}m${ex.rest_seconds % 60 > 0 ? ` ${ex.rest_seconds % 60}s` : ""}` : `${ex.rest_seconds}s`) : "None"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="flex items-center justify-around border-t border-border bg-background px-2 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
        <button
          disabled={selectedCount < 2}
          onClick={() => {
            if (selectedCount >= 2) toast("Superset created!");
          }}
          className={`flex flex-col items-center gap-1 transition-colors ${
            selectedCount >= 2
              ? "text-primary hover:text-primary/80"
              : "text-muted-foreground/30 cursor-not-allowed"
          }`}
        >
          <Layers className="h-5 w-5" />
          <span className="text-[10px] font-medium">Superset</span>
        </button>
        <button
          disabled={selectedCount < 2}
          onClick={() => {
            if (selectedCount >= 2) toast("Circuit created!");
          }}
          className={`flex flex-col items-center gap-1 transition-colors ${
            selectedCount >= 2
              ? "text-primary hover:text-primary/80"
              : "text-muted-foreground/30 cursor-not-allowed"
          }`}
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

      <ExerciseLibrarySheet
        open={showExerciseLibrary}
        onClose={() => setShowExerciseLibrary(false)}
        onAdd={(selectedExercises) => {
          const newItems: WodExercise[] = selectedExercises.map((ex) => ({
            id: crypto.randomUUID(),
            exercise_id: ex.id,
            exercise_name: ex.name,
            image_url: ex.image_url,
            sets: 3,
            reps: "10",
            rest_seconds: 90,
            selected: false,
          }));
          setExercises((prev) => [...prev, ...newItems]);
          toast.success(`Added ${selectedExercises.length} exercise(s)`);
        }}
      />

      {/* Sets slider sheet */}
      {editingSetsId && (() => {
        const ex = exercises.find((e) => e.id === editingSetsId);
        if (!ex) return null;
        return (
          <SetsSliderSheet
            open
            value={ex.sets}
            onSave={(v) => updateExerciseField(editingSetsId, "sets", v)}
            onClose={() => setEditingSetsId(null)}
          />
        );
      })()}

      {/* Set target sheet */}
      {editingTargetId && (() => {
        const ex = exercises.find((e) => e.id === editingTargetId);
        if (!ex) return null;
        return (
          <SetTargetSheet
            open
            value={ex.reps}
            onSave={(v) => updateExerciseField(editingTargetId, "reps", v)}
            onClose={() => setEditingTargetId(null)}
          />
        );
      })()}

      {/* Rest time picker sheet */}
      {editingRestId && (() => {
        const ex = exercises.find((e) => e.id === editingRestId);
        if (!ex) return null;
        return (
          <RestTimePickerSheet
            open
            value={ex.rest_seconds}
            onSave={(v) => updateExerciseField(editingRestId, "rest_seconds", v)}
            onClose={() => setEditingRestId(null)}
          />
        );
      })()}
    </div>
  );
}
