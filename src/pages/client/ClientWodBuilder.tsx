import { useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Trash2, Dumbbell, Hand, Layers, Repeat, GripVertical, Timer, X } from "lucide-react";


import { ExerciseLibrarySheet } from "@/components/workout/ExerciseLibrarySheet";
import { SetsSliderSheet } from "@/components/workout/SetsSliderSheet";
import { SetTargetSheet } from "@/components/workout/SetTargetSheet";
import { RestTimePickerSheet } from "@/components/workout/RestTimePickerSheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

function SwipeToDeleteCard({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const activeRef = useRef(false); // Only true after horizontal threshold met

  const onTS = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = 0;
    activeRef.current = false;
  };

  const onTM = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    const dx = e.touches[0].clientX - startXRef.current;
    // Only activate swipe after 15px horizontal movement
    if (!activeRef.current && Math.abs(dx) < 15) return;
    activeRef.current = true;
    if (dx > 0) { currentXRef.current = 0; containerRef.current.style.transform = ''; return; }
    currentXRef.current = dx;
    containerRef.current.style.transform = `translateX(${Math.max(dx, -120)}px)`;
    containerRef.current.style.transition = 'none';
  };

  const onTE = () => {
    if (!containerRef.current) return;
    containerRef.current.style.transition = 'transform 0.25s ease';
    if (activeRef.current && currentXRef.current < -70) {
      containerRef.current.style.transform = 'translateX(-100%)';
      setTimeout(onDelete, 250);
    } else {
      containerRef.current.style.transform = '';
    }
    currentXRef.current = 0;
    activeRef.current = false;
  };

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-end bg-destructive pr-5">
        <Trash2 className="h-5 w-5 text-destructive-foreground" />
      </div>
      <div ref={containerRef} onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE} className="relative z-10">
        {children}
      </div>
    </div>
  );
}

interface WodExercise {
  id: string;
  exercise_id: string;
  exercise_name: string;
  image_url: string | null;
  sets: number;
  reps: string;
  target_type: "text" | "time";
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

const isGroupedWorkoutType = (type: string) => type === "circuit" || type === "superset";

export default function ClientWodBuilder() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const workoutType = searchParams.get("type") || "regular";
  const defaultGroupType: ExerciseGroup["type"] = workoutType === "superset" || workoutType === "interval" ? "superset" : "circuit";

  const [exercises, setExercises] = useState<WodExercise[]>([]);
  const [showExerciseLibrary, setShowExerciseLibrary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDragHint, setShowDragHint] = useState(true);
  const [editingSetsId, setEditingSetsId] = useState<string | null>(null);
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [editingRestId, setEditingRestId] = useState<string | null>(null);
  const [groups, setGroups] = useState<ExerciseGroup[]>([]);
  const [editingCircuitRoundsId, setEditingCircuitRoundsId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const setItemRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) itemRefs.current.set(id, el);
    else itemRefs.current.delete(id);
  }, []);

  // Drag operates on the exercises array index
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
    // Find which exercise the finger is over by checking all refs
    for (let i = 0; i < exercises.length; i++) {
      const el = itemRefs.current.get(exercises[i].id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        setOverIndex(i);
        break;
      }
    }
  }, [exercises]);

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
    if (!user?.id) {
      toast.error("Not authenticated");
      return;
    }
    setSaving(true);
    try {
      // Build sections from groups + ungrouped exercises
      const realExercises = exercises.filter((e) => e.exercise_id !== "rest");
      const restItems = exercises.filter((e) => e.exercise_id === "rest");

      // Calculate estimated duration
      let estSeconds = 0;
      exercises.forEach((ex) => {
        if (ex.exercise_id === "rest") {
          estSeconds += ex.rest_seconds || 0;
        } else {
          const repsVal = parseInt(ex.reps) || 0;
          const isTime = ex.target_type === "time";
          const durationSec = isTime ? (parseInt(ex.reps) || 30) : (repsVal * 3);
          estSeconds += (durationSec + (ex.rest_seconds || 0)) * (ex.sets || 1);
        }
      });
      const estMinutes = Math.max(1, Math.ceil(estSeconds / 60));

      // Create workout plan
      const { data: plan, error: planError } = await supabase
        .from("workout_plans")
        .insert({
          name: "Workout of the Day",
          trainer_id: user.id,
          category: workoutType,
          difficulty: "intermediate" as any,
          duration_minutes: estMinutes,
        })
        .select("id")
        .single();
      if (planError) throw planError;

      const planId = plan.id;

      // Organize exercises into sections
      const usedGroupIds = [...new Set(exercises.filter((e) => e.group_id).map((e) => e.group_id!))];
      const sections: { name: string; type: string; rounds: number; exerciseItems: WodExercise[] }[] = [];
      let currentUngrouped: WodExercise[] = [];

      exercises.forEach((ex) => {
        if (ex.group_id) {
          // Flush ungrouped
          if (currentUngrouped.length > 0) {
            sections.push({ name: "Main", type: "regular", rounds: 1, exerciseItems: currentUngrouped });
            currentUngrouped = [];
          }
          // Check if group section already added
          const existingGroupSection = sections.find((s) => s.name === ex.group_id);
          if (!existingGroupSection) {
            const group = groups.find((g) => g.id === ex.group_id);
            const groupExercises = exercises.filter((e) => e.group_id === ex.group_id);
            sections.push({
              name: ex.group_id!,
              type: group?.type || "circuit",
              rounds: group?.rounds || 3,
              exerciseItems: groupExercises,
            });
          }
        } else {
          currentUngrouped.push(ex);
        }
      });
      if (currentUngrouped.length > 0) {
        sections.push({ name: "Main", type: "regular", rounds: 1, exerciseItems: currentUngrouped });
      }

      // Insert sections + exercises
      for (let sIdx = 0; sIdx < sections.length; sIdx++) {
        const sec = sections[sIdx];
        const sectionName = sec.type === "circuit" ? "Circuit" : sec.type === "superset" ? "Superset" : `Section ${sIdx + 1}`;

        const { data: sectionRow, error: secError } = await supabase
          .from("workout_sections")
          .insert({
            workout_plan_id: planId,
            name: sectionName,
            section_type: sec.type,
            rounds: sec.rounds,
            order_index: sIdx,
          })
          .select("id")
          .single();
        if (secError) throw secError;

        const exInserts = sec.exerciseItems
          .filter((ex) => ex.exercise_id !== "rest")
          .map((ex, eIdx) => {
            const isTime = ex.target_type === "time";
            return {
              workout_plan_id: planId,
              section_id: sectionRow.id,
              exercise_id: ex.exercise_id,
              order_index: eIdx,
              sets: ex.sets || 1,
              reps: isTime ? null : (parseInt(ex.reps) || null),
              duration_seconds: isTime ? (parseInt(ex.reps) || null) : null,
              rest_seconds: ex.rest_seconds || null,
            };
          });

        if (exInserts.length > 0) {
          const { error: exError } = await supabase
            .from("workout_plan_exercises")
            .insert(exInserts);
          if (exError) throw exError;
        }
      }

      toast.success("Workout saved!");
      navigate(`/client/workouts/${planId}`);
    } catch (err) {
      console.error("Failed to save WOD:", err);
      toast.error("Failed to save workout");
    } finally {
      setSaving(false);
    }
  };

  const handleAddRest = () => {
    const restItem: WodExercise = {
      id: crypto.randomUUID(),
      exercise_id: "rest",
      exercise_name: "Rest",
      image_url: null,
      sets: 1,
      reps: "60s",
      target_type: "time",
      rest_seconds: 60,
      selected: false,
      group_id: null,
    };
    setExercises((prev) => [...prev, restItem]);
  };

  const handleDeleteSelected = () => {
    const hasSelected = exercises.some((e) => e.selected) || groups.some((g) => g.selected);
    if (hasSelected) {
      const selectedGroupIds = groups.filter((g) => g.selected).map((g) => g.id);
      setExercises((prev) => prev.filter((e) => !e.selected && !selectedGroupIds.includes(e.group_id || "")));
      setGroups((prev) => prev.filter((g) => !g.selected));
    } else if (exercises.length > 0) {
      toast.error("Select exercises to delete first");
    }
  };

  const toggleSelect = (id: string) => {
    setExercises((prev) =>
      prev.map((e) => (e.id === id ? { ...e, selected: !e.selected } : e))
    );
  };

  const toggleGroupSelect = (groupId: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, selected: !g.selected } : g))
    );
  };

  const handleCreateGroup = (type: "circuit" | "superset") => {
    const selectedIds = exercises.filter((e) => e.selected && !e.group_id).map((e) => e.id);
    if (selectedIds.length < 2) return;
    const groupId = crypto.randomUUID();
    const newGroup: ExerciseGroup = { id: groupId, type, rounds: 3, selected: false };
    setGroups((prev) => [...prev, newGroup]);
    setExercises((prev) =>
      prev.map((e) =>
        selectedIds.includes(e.id) ? { ...e, selected: false, group_id: groupId } : e
      )
    );
    toast.success(`${type === "circuit" ? "Circuit" : "Superset"} created!`);
  };

  const handleUngroup = (groupId: string) => {
    setExercises((prev) =>
      prev.map((e) => (e.group_id === groupId ? { ...e, group_id: null } : e))
    );
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
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
  const anyGroupSelected = groups.some((g) => g.selected);

  // Build render items: ungrouped exercises + groups with their children
  const renderItems: Array<{ type: "exercise"; exercise: WodExercise; index: number } | { type: "group"; group: ExerciseGroup; exercises: WodExercise[] }> = [];
  const usedIds = new Set<string>();

  exercises.forEach((ex, index) => {
    if (usedIds.has(ex.id)) return;

    if (ex.group_id) {
      const group = groups.find((g) => g.id === ex.group_id);
      if (group && !usedIds.has(group.id)) {
        usedIds.add(group.id);
        const groupExercises = exercises.filter((e) => e.group_id === group.id);
        groupExercises.forEach((ge) => usedIds.add(ge.id));
        renderItems.push({ type: "group", group, exercises: groupExercises });
      }
    } else {
      usedIds.add(ex.id);
      renderItems.push({ type: "exercise", exercise: ex, index });
    }
  });

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
        <button
          onClick={() => navigate("/client/dashboard")}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <span className="text-sm font-semibold text-foreground capitalize">{workoutType} Workout</span>
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
            {/* Select all / Deselect all */}
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <button
                onClick={() => {
                  const allSelected = exercises.every((e) => e.selected);
                  setExercises((prev) => prev.map((e) => ({ ...e, selected: !allSelected })));
                }}
                className="shrink-0"
              >
                <div className={`w-5 h-5 rounded border-[1.5px] flex items-center justify-center transition-colors ${exercises.length > 0 && exercises.every((e) => e.selected) ? "bg-primary border-primary" : "border-muted-foreground/30 bg-transparent"}`}>
                  {exercises.length > 0 && exercises.every((e) => e.selected) && (
                    <svg className="h-3 w-3 text-primary-foreground" viewBox="0 0 14 14" fill="none">
                      <path d="M2 7l3.5 3.5L12 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </button>
              <span className="text-xs font-medium text-muted-foreground">
                {exercises.every((e) => e.selected) ? "Deselect All" : "Select All"}
              </span>
            </div>
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

            {/* Render items */}
            {renderItems.map((item) => {
              if (item.type === "exercise") {
                const ex = item.exercise;
                const exIndex = exercises.indexOf(ex);
                return (
                  <SwipeToDeleteCard
                    key={ex.id}
                    onDelete={() => {
                      setExercises((prev) => prev.filter((e) => e.id !== ex.id));
                      toast.success(`Removed ${ex.exercise_name}`);
                    }}
                  >
                    <div
                      ref={(el) => setItemRef(ex.id, el)}
                      draggable
                      onDragStart={() => handleDragStart(exIndex)}
                      onDragOver={(e) => { e.preventDefault(); handleDragOver(exIndex); }}
                      onDragEnd={handleDragEnd}
                      onTouchStart={(e) => handleTouchStart(e, exIndex)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      className={`border-b border-border py-3 transition-all bg-background ${ex.selected ? "bg-primary/5" : ""} ${dragIndex === exIndex ? "opacity-50 scale-95" : ""} ${overIndex === exIndex && dragIndex !== null && dragIndex !== exIndex ? "border-t-2 border-t-primary" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleSelect(ex.id)} className="shrink-0">
                          <div className={`w-5 h-5 rounded border-[1.5px] flex items-center justify-center transition-colors ${ex.selected ? "bg-primary border-primary" : "border-muted-foreground/30 bg-transparent"}`}>
                            {ex.selected && (
                              <svg className="h-3 w-3 text-primary-foreground" viewBox="0 0 14 14" fill="none">
                                <path d="M2 7l3.5 3.5L12 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                        </button>
                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                          {ex.exercise_id === "rest" ? (
                            <Timer className="h-6 w-6 text-muted-foreground/40" />
                          ) : ex.image_url ? (
                            <img src={ex.image_url} alt={ex.exercise_name} className="w-full h-full object-cover" />
                          ) : (
                            <Dumbbell className="h-6 w-6 text-muted-foreground/40" />
                          )}
                        </div>
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => { if (ex.exercise_id === "rest") setEditingRestId(ex.id); }}
                        >
                          <p className="text-sm font-semibold text-foreground truncate">
                            {ex.exercise_name}{ex.exercise_id === "rest" && ex.rest_seconds > 0 ? ` · ${ex.rest_seconds >= 60 ? `${Math.floor(ex.rest_seconds / 60)}m${ex.rest_seconds % 60 > 0 ? ` ${ex.rest_seconds % 60}s` : ""}` : `${ex.rest_seconds}s`}` : ""}
                          </p>
                        </div>
                        <div className="shrink-0 text-muted-foreground/30 cursor-grab">
                          <GripVertical className="h-5 w-5" />
                        </div>
                      </div>
                      {ex.exercise_id !== "rest" && (
                        <div className="flex items-center gap-2 mt-2 ml-7 pl-1">
                          <button onClick={() => setEditingSetsId(ex.id)} className="px-3 py-1 rounded-full border border-border text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                            {ex.sets} sets
                          </button>
                          <button onClick={() => setEditingTargetId(ex.id)} className="px-3 py-1 rounded-full border border-border text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                            {ex.reps === "10" && ex.target_type === "text" ? "Set Target" : ex.target_type === "time" ? `⏱ ${ex.reps}` : ex.reps}
                          </button>
                          {workoutType !== "interval" && (
                            <button onClick={() => setEditingRestId(ex.id)} className="px-3 py-1 rounded-full border border-border text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center gap-1">
                              <Hand className="h-3 w-3" />
                              {ex.rest_seconds > 0 ? (ex.rest_seconds >= 60 ? `${Math.floor(ex.rest_seconds / 60)}m${ex.rest_seconds % 60 > 0 ? ` ${ex.rest_seconds % 60}s` : ""}` : `${ex.rest_seconds}s`) : "None"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </SwipeToDeleteCard>
                );
              }

              // Group (circuit or superset)
              const { group, exercises: groupExercises } = item;
              return (
                <div key={group.id} className="border-b border-border bg-muted/30 rounded-lg my-1 overflow-hidden">
                  {/* Group header */}
                  <div className="flex items-center gap-2 px-3 py-3 bg-muted/50">
                    <button onClick={() => toggleGroupSelect(group.id)} className="shrink-0">
                      <div className={`w-5 h-5 rounded border-[1.5px] flex items-center justify-center transition-colors ${group.selected ? "bg-primary border-primary" : "border-muted-foreground/30 bg-transparent"}`}>
                        {group.selected && (
                          <svg className="h-3 w-3 text-primary-foreground" viewBox="0 0 14 14" fill="none">
                            <path d="M2 7l3.5 3.5L12 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-foreground">
                        {group.type === "circuit" ? "Circuit" : "Superset"} of{" "}
                        <button
                          onClick={() => setEditingCircuitRoundsId(group.id)}
                          className="text-primary font-semibold"
                        >
                          {group.rounds} rounds
                        </button>
                      </span>
                    </div>
                    <button
                      onClick={() => handleUngroup(group.id)}
                      className="text-xs font-semibold text-primary mr-1"
                    >
                      Ungroup
                    </button>
                    <div className="shrink-0 text-muted-foreground/30 cursor-grab">
                      <GripVertical className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Group exercises - no checkbox, no sets pill */}
                  {groupExercises.map((ex) => (
                    <div key={ex.id} className="py-3 px-3 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                          {ex.image_url ? (
                            <img src={ex.image_url} alt={ex.exercise_name} className="w-full h-full object-cover" />
                          ) : (
                            <Dumbbell className="h-6 w-6 text-muted-foreground/40" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{ex.exercise_name}</p>
                        </div>
                      </div>
                      {ex.exercise_id !== "rest" && (
                        <div className="flex items-center gap-2 mt-2 ml-1">
                          <button onClick={() => setEditingTargetId(ex.id)} className="px-3 py-1 rounded-full border border-border text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                            {ex.reps === "10" && ex.target_type === "text" ? "Set Target" : ex.target_type === "time" ? `⏱ ${ex.reps}` : ex.reps}
                          </button>
                          <button onClick={() => setEditingRestId(ex.id)} className="px-3 py-1 rounded-full border border-border text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center gap-1">
                            <Hand className="h-3 w-3" />
                            {ex.rest_seconds > 0 ? (ex.rest_seconds >= 60 ? `${Math.floor(ex.rest_seconds / 60)}m${ex.rest_seconds % 60 > 0 ? ` ${ex.rest_seconds % 60}s` : ""}` : `${ex.rest_seconds}s`) : "None"}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="flex items-center justify-around border-t border-border bg-background px-2 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
        <button
          disabled={selectedCount < 2}
          onClick={() => { if (selectedCount >= 2) handleCreateGroup("superset"); }}
          className={`flex flex-col items-center gap-1 transition-colors ${
            selectedCount >= 2 ? "text-primary hover:text-primary/80" : "text-muted-foreground/30 cursor-not-allowed"
          }`}
        >
          <Layers className="h-5 w-5" />
          <span className="text-[10px] font-medium">Superset</span>
        </button>
        <button
          disabled={selectedCount < 2}
          onClick={() => { if (selectedCount >= 2) handleCreateGroup("circuit"); }}
          className={`flex flex-col items-center gap-1 transition-colors ${
            selectedCount >= 2 ? "text-primary hover:text-primary/80" : "text-muted-foreground/30 cursor-not-allowed"
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
            target_type: "text" as const,
            rest_seconds: 90,
            selected: false,
            group_id: null,
          }));

          if (isGroupedWorkoutType(workoutType)) {
            const existingUngrouped = exercises.filter((exercise) => !exercise.group_id && exercise.exercise_id !== "rest");
            const shouldCreateGroup = groups.length === 0 && existingUngrouped.length + newItems.length >= 2;

            if (shouldCreateGroup) {
              const groupId = crypto.randomUUID();
              const newGroup: ExerciseGroup = { id: groupId, type: defaultGroupType, rounds: 3, selected: false };
              setGroups((prev) => [...prev, newGroup]);
              setExercises((prev) => prev.map((exercise) => (
                !exercise.group_id && exercise.exercise_id !== "rest"
                  ? { ...exercise, group_id: groupId }
                  : exercise
              )).concat(newItems.map((item) => ({ ...item, group_id: groupId }))));
              toast.success(`Added ${selectedExercises.length} exercise(s)`);
              return;
            }

            const existingPrimaryGroup = groups[0];
            if (existingPrimaryGroup) {
              setExercises((prev) => [...prev, ...newItems.map((item) => ({ ...item, group_id: existingPrimaryGroup.id }))]);
              toast.success(`Added ${selectedExercises.length} exercise(s)`);
              return;
            }
          }

          // For interval mode, interleave rest blocks between exercises
          if (workoutType === "interval") {
            const interleaved: WodExercise[] = [];
            newItems.forEach((item, i) => {
              interleaved.push(item);
              if (i < newItems.length - 1) {
                interleaved.push({
                  id: crypto.randomUUID(),
                  exercise_id: "rest",
                  exercise_name: "Rest",
                  image_url: null,
                  sets: 1,
                  reps: "30s",
                  target_type: "time",
                  rest_seconds: 30,
                  selected: false,
                  group_id: null,
                });
              }
            });
            setExercises((prev) => {
              // Also add a rest before the new batch if there are existing exercises
              if (prev.length > 0 && prev[prev.length - 1].exercise_id !== "rest") {
                return [...prev, {
                  id: crypto.randomUUID(),
                  exercise_id: "rest",
                  exercise_name: "Rest",
                  image_url: null,
                  sets: 1,
                  reps: "30s",
                  target_type: "time" as const,
                  rest_seconds: 30,
                  selected: false,
                  group_id: null,
                }, ...interleaved];
              }
              return [...prev, ...interleaved];
            });
          } else {
            setExercises((prev) => [...prev, ...newItems]);
          }
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
            initialTargetType={ex.target_type}
            onSave={(v, type) => {
              setExercises((prev) => prev.map((e) => e.id === editingTargetId ? { ...e, reps: v, target_type: type } : e));
            }}
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

      {/* Circuit/Superset rounds slider */}
      {editingCircuitRoundsId && (() => {
        const group = groups.find((g) => g.id === editingCircuitRoundsId);
        if (!group) return null;
        return (
          <SetsSliderSheet
            open
            value={group.rounds}
            onSave={(v) => setGroups((prev) => prev.map((g) => g.id === editingCircuitRoundsId ? { ...g, rounds: v } : g))}
            onClose={() => setEditingCircuitRoundsId(null)}
          />
        );
      })()}
    </div>
  );
}
