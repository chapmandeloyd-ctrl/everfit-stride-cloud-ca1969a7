import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Plus, Check, Wand2, Lightbulb, ChevronDown, ChevronUp, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WorkoutExercise {
  id: string;
  exercise_id: string;
  sets: number;
  target_type: "text" | "time";
  target_value: string;
  time_seconds: number;
  rest_seconds: number;
  exercise_type: "normal" | "rest";
  selected: boolean;
  group_id: string | null;
}

interface ExerciseGroup {
  id: string;
  type: "superset" | "circuit";
  sets: number;
}

interface AIWorkoutBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: any[];
  onApplyWorkout: (
    name: string,
    description: string,
    category: string,
    difficulty: string,
    items: WorkoutExercise[],
    groups: ExerciseGroup[]
  ) => void;
  onAddExercises: (items: WorkoutExercise[]) => void;
}

interface AISuggestion {
  exercise_name: string;
  sets: number;
  reps_or_time: string;
  rest_seconds: number;
  reason?: string;
  notes?: string;
}

interface AISection {
  block_label?: string;
  section_name: string;
  section_type: "straight_set" | "superset" | "circuit";
  rounds: number;
  exercises: AISuggestion[];
}

interface AIWorkoutResult {
  workout_name: string;
  description: string;
  category: string;
  difficulty: string;
  sections: AISection[];
}

const PROMPT_EXAMPLES = [
  "Build a 45-minute upper body push day for intermediate lifters",
  "Create a full body circuit workout, 30 minutes, beginner friendly",
  "Design a leg day with supersets, heavy compound movements",
  "Quick 20-minute core and abs burnout session",
];

// Strip non-Latin characters (e.g., Chinese/Japanese/Arabic) and emoji from AI-generated names.
// Keeps letters, numbers, spaces, and common punctuation. Voice TTS reads cleanly.
const sanitizeName = (s: string): string => {
  if (!s) return s;
  return s
    .replace(/[^\x00-\x7F]+/g, "") // strip all non-ASCII
    .replace(/\s+/g, " ")
    .trim();
};

const sanitizeWorkoutResult = (r: AIWorkoutResult): AIWorkoutResult => ({
  ...r,
  workout_name: sanitizeName(r.workout_name),
  description: sanitizeName(r.description),
  sections: r.sections.map(sec => ({
    ...sec,
    // Force section_name to match the predefined block_label so it maps to a real block type
    // and never shows as "Custom Block".
    section_name: sanitizeName(sec.block_label || sec.section_name),
    exercises: sec.exercises.map(ex => ({ ...ex, exercise_name: sanitizeName(ex.exercise_name) })),
  })),
});

export function AIWorkoutBuilderDialog({
  open,
  onOpenChange,
  exercises,
  onApplyWorkout,
  onAddExercises,
}: AIWorkoutBuilderDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("full");

  // Full workout result
  const [workoutResult, setWorkoutResult] = useState<AIWorkoutResult | null>(null);

  // Exercise suggestions
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [addedSuggestions, setAddedSuggestions] = useState<Set<string>>(new Set());

  // "Why these exercises?" explanation panel
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);

  const exerciseNames = exercises?.map((e) => e.name) || [];

  const normalize = (s: string) =>
    s.toLowerCase().replace(/[-_'']/g, " ").replace(/\s+/g, " ").trim();

  const findExerciseByName = (name: string) => {
    const n = normalize(name);
    // Exact match first
    const exact = exercises?.find((e) => normalize(e.name) === n);
    if (exact) return exact;
    // Contains match (AI might add/drop words)
    return exercises?.find(
      (e) => normalize(e.name).includes(n) || n.includes(normalize(e.name))
    );
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setWorkoutResult(null);
    setSuggestions([]);
    setAddedSuggestions(new Set());

    try {
      const { data, error } = await supabase.functions.invoke("ai-workout-builder", {
        body: {
          mode: activeTab === "full" ? "full_workout" : "suggest_exercise",
          prompt: prompt.trim(),
          exercise_names: exerciseNames,
        },
      });

      if (error) throw error;

      if (data?.result) {
        if (activeTab === "full") {
          setWorkoutResult(sanitizeWorkoutResult(data.result as AIWorkoutResult));
        } else {
          const cleaned = (data.result.suggestions || []).map((s: AISuggestion) => ({
            ...s,
            exercise_name: sanitizeName(s.exercise_name),
          }));
          setSuggestions(cleaned);
        }
      }
    } catch (err: any) {
      console.error("AI workout builder error:", err);
      toast.error(err?.message || "Failed to generate workout");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyFullWorkout = () => {
    if (!workoutResult) return;

    const items: WorkoutExercise[] = [];
    const newGroups: ExerciseGroup[] = [];

    for (const section of workoutResult.sections) {
      let groupId: string | null = null;

      if (section.section_type !== "straight_set" && section.exercises.length >= 2) {
        groupId = crypto.randomUUID();
        newGroups.push({
          id: groupId,
          type: section.section_type as "superset" | "circuit",
          sets: section.rounds || 3,
        });
      }

      for (const ex of section.exercises) {
        const found = findExerciseByName(ex.exercise_name);
        if (!found) continue;

        const isTime = /sec|min/i.test(ex.reps_or_time);
        let timeSeconds = 30;
        if (isTime) {
          const minMatch = ex.reps_or_time.match(/(\d+)\s*min/i);
          const secMatch = ex.reps_or_time.match(/(\d+)\s*sec/i);
          timeSeconds = (minMatch ? parseInt(minMatch[1]) * 60 : 0) + (secMatch ? parseInt(secMatch[1]) : 0);
          if (timeSeconds === 0) timeSeconds = 30;
        }

        items.push({
          id: crypto.randomUUID(),
          exercise_id: found.id,
          sets: section.section_type !== "straight_set" ? 1 : (ex.sets || 3),
          target_type: isTime ? "time" : "text",
          target_value: isTime ? "" : (ex.reps_or_time || ""),
          time_seconds: isTime ? timeSeconds : 30,
          rest_seconds: ex.rest_seconds || 30,
          exercise_type: "normal",
          selected: false,
          group_id: groupId,
        });
      }
    }

    if (items.length === 0) {
      toast.error("No matching exercises found in your library");
      return;
    }

    onApplyWorkout(
      workoutResult.workout_name,
      workoutResult.description,
      workoutResult.category,
      workoutResult.difficulty,
      items,
      newGroups,
    );

    toast.success(`Applied ${items.length} exercises from AI workout`);
    onOpenChange(false);
    setWorkoutResult(null);
    setPrompt("");
  };

  const handleAddSuggestion = (suggestion: AISuggestion) => {
    const found = findExerciseByName(suggestion.exercise_name);
    if (!found) {
      toast.error(`Exercise "${suggestion.exercise_name}" not found in your library`);
      return;
    }

    const isTime = /sec|min/i.test(suggestion.reps_or_time);
    let timeSeconds = 30;
    if (isTime) {
      const minMatch = suggestion.reps_or_time.match(/(\d+)\s*min/i);
      const secMatch = suggestion.reps_or_time.match(/(\d+)\s*sec/i);
      timeSeconds = (minMatch ? parseInt(minMatch[1]) * 60 : 0) + (secMatch ? parseInt(secMatch[1]) : 0);
      if (timeSeconds === 0) timeSeconds = 30;
    }

    const item: WorkoutExercise = {
      id: crypto.randomUUID(),
      exercise_id: found.id,
      sets: suggestion.sets || 3,
      target_type: isTime ? "time" : "text",
      target_value: isTime ? "" : (suggestion.reps_or_time || ""),
      time_seconds: isTime ? timeSeconds : 30,
      rest_seconds: suggestion.rest_seconds || 30,
      exercise_type: "normal",
      selected: false,
      group_id: null,
    };

    onAddExercises([item]);
    setAddedSuggestions((prev) => new Set(prev).add(suggestion.exercise_name));
    toast.success(`Added ${suggestion.exercise_name}`);
  };

  const totalMatchedExercises = workoutResult
    ? workoutResult.sections.reduce((acc, s) => acc + s.exercises.filter((e) => findExerciseByName(e.exercise_name)).length, 0)
    : 0;

  const totalExercises = workoutResult
    ? workoutResult.sections.reduce((acc, s) => acc + s.exercises.length, 0)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Workout Builder
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto px-6 pb-6">

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setWorkoutResult(null); setSuggestions([]); }}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="full" className="gap-1.5">
              <Wand2 className="h-3.5 w-3.5" />
              Full Workout
            </TabsTrigger>
            <TabsTrigger value="suggest" className="gap-1.5">
              <Lightbulb className="h-3.5 w-3.5" />
              Exercise Suggestions
            </TabsTrigger>
          </TabsList>

          {/* Prompt area - shared */}
          <div className="mt-4 space-y-3">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                activeTab === "full"
                  ? "Describe the workout you want to build..."
                  : "Describe what exercises you need suggestions for..."
              }
              rows={3}
              className="resize-none"
            />

            {/* Quick prompt chips */}
            {activeTab === "full" && !workoutResult && (
              <div className="flex flex-wrap gap-1.5">
                {PROMPT_EXAMPLES.map((example) => (
                  <button
                    key={example}
                    onClick={() => setPrompt(example)}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {activeTab === "full" ? "Generate Workout" : "Get Suggestions"}
                </>
              )}
            </Button>
          </div>

          {/* Full Workout Result */}
          <TabsContent value="full" className="mt-0">
            {workoutResult && (
              <div className="space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm">{workoutResult.workout_name}</h3>
                    <p className="text-xs text-muted-foreground">{workoutResult.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{workoutResult.category}</Badge>
                    <Badge variant="secondary" className="text-xs">{workoutResult.difficulty}</Badge>
                  </div>
                </div>

                {totalMatchedExercises < totalExercises && (
                  <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded px-3 py-1.5">
                    ⚠ {totalExercises - totalMatchedExercises} exercise(s) not found in your library and will be skipped
                  </p>
                )}

                <div className="space-y-3">
                    {workoutResult.sections.map((section, si) => (
                      <div key={si} className="border rounded-lg overflow-hidden">
                        <div className="bg-muted/50 px-3 py-1.5 flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase">{section.section_name}</span>
                          {section.section_type !== "straight_set" && (
                            <Badge variant="outline" className="text-[10px] h-4">
                              {section.section_type} × {section.rounds}
                            </Badge>
                          )}
                        </div>
                        {section.exercises.map((ex, ei) => {
                          const found = findExerciseByName(ex.exercise_name);
                          return (
                            <div
                              key={ei}
                              className={`px-3 py-2 border-t flex items-center gap-3 text-xs ${
                                !found ? "opacity-40 line-through" : ""
                              }`}
                            >
                              <span className="font-medium flex-1">{ex.exercise_name}</span>
                              <span className="text-muted-foreground">
                                {ex.sets}×{ex.reps_or_time}
                              </span>
                              <span className="text-muted-foreground">
                                Rest {ex.rest_seconds}s
                              </span>
                              {found ? (
                                <Check className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <span className="text-destructive text-[10px]">Not found</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleApplyFullWorkout}
                    className="flex-1 gap-2"
                    disabled={totalMatchedExercises === 0}
                  >
                    <Check className="h-4 w-4" />
                    Apply Workout ({totalMatchedExercises} exercises)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setWorkoutResult(null); }}
                  >
                    Regenerate
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Suggestion Results */}
          <TabsContent value="suggest" className="mt-0">
            {suggestions.length > 0 && (
              <div className="space-y-2 mt-4">
                  {suggestions.map((suggestion, i) => {
                    const found = findExerciseByName(suggestion.exercise_name);
                    const isAdded = addedSuggestions.has(suggestion.exercise_name);
                    return (
                      <div
                        key={i}
                        className={`border rounded-lg p-3 flex items-start gap-3 ${
                          !found ? "opacity-40" : ""
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{suggestion.exercise_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {suggestion.sets}×{suggestion.reps_or_time} · Rest {suggestion.rest_seconds}s
                          </p>
                          {suggestion.reason && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              {suggestion.reason}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant={isAdded ? "secondary" : "default"}
                          className="shrink-0 gap-1"
                          disabled={!found || isAdded}
                          onClick={() => handleAddSuggestion(suggestion)}
                        >
                          {isAdded ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              Added
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5" />
                              Add
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
              </div>
            )}
          </TabsContent>
        </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
