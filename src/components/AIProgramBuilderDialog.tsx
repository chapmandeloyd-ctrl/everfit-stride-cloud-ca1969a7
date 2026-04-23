import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Loader2, Calendar, ArrowLeft, Check, Dumbbell, Wand2, Library, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface AIProgramBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProgramCreated?: () => void;
}

type Step = "setup" | "generating" | "preview";

interface ScheduleItem {
  week_number: number;
  day_of_week: number;
  workout_name: string;
  notes?: string;
}

interface GeneratedSectionExercise {
  exercise_name: string;
  sets: number;
  reps_or_time: string;
  rest_seconds: number;
  notes?: string;
}

interface GeneratedSection {
  block_label: string;
  section_name: string;
  section_type: "straight_set" | "superset" | "circuit";
  rounds: number;
  exercises: GeneratedSectionExercise[];
}

interface GeneratedWorkout {
  name: string;
  description: string;
  category: string;
  difficulty: string;
  sections: GeneratedSection[];
}

interface GeneratedProgram {
  program_name: string;
  program_description: string;
  schedule: ScheduleItem[];
  workouts?: GeneratedWorkout[]; // present in full-build mode
}

const estimateSecondsFromPrescription = (prescription?: string) => {
  if (!prescription) return 45;

  const lower = prescription.toLowerCase().trim();
  const firstNumber = Number((lower.match(/\d+/) || [""])[0]);

  if (lower.includes("min")) return firstNumber > 0 ? firstNumber * 60 : 60;
  if (lower.includes("sec") || /\b\d+s\b/.test(lower)) return firstNumber > 0 ? firstNumber : 45;

  if (firstNumber > 0) {
    return Math.min(120, Math.max(25, firstNumber * 6));
  }

  return 45;
};

const estimateWorkoutDurationMinutes = (workout: GeneratedWorkout) => {
  const totalSeconds = (workout.sections || []).reduce((sectionTotal, section) => {
    const exerciseSeconds = (section.exercises || []).reduce((exerciseTotal, exercise) => {
      const perSetSeconds = estimateSecondsFromPrescription(exercise.reps_or_time);
      const sets = Math.max(1, exercise.sets || 1);
      const restSeconds = Math.max(0, exercise.rest_seconds || 0);
      return exerciseTotal + sets * perSetSeconds + Math.max(0, sets - 1) * restSeconds;
    }, 0);

    return sectionTotal + exerciseSeconds;
  }, 0);

  if (totalSeconds <= 0) return 45;
  return Math.min(180, Math.max(15, Math.ceil(totalSeconds / 60)));
};

const DAY_LABELS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAYS_FULL = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

const DRAFT_STORAGE_KEY = "ai-program-builder-draft";

interface PersistedDraft {
  generated: GeneratedProgram;
  buildMode: "use_existing" | "full_build";
  prompt: string;
  weeks: string;
  daysPerWeek: string;
  selectedWorkoutIds: string[];
  savedAt: number;
}

export function AIProgramBuilderDialog({ open, onOpenChange, onProgramCreated }: AIProgramBuilderDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("setup");
  const [buildMode, setBuildMode] = useState<"use_existing" | "full_build">("use_existing");
  const [prompt, setPrompt] = useState("");
  const [selectedWorkoutIds, setSelectedWorkoutIds] = useState<string[]>([]);
  const [weeks, setWeeks] = useState("6");
  const [daysPerWeek, setDaysPerWeek] = useState("4");
  const [progression, setProgression] = useState<"linear" | "wave" | "none">("linear");
  const [restStrategy, setRestStrategy] = useState<"auto" | "fixed">("auto");
  const [fixedPattern, setFixedPattern] = useState<number[]>([1, 3, 5]);

  // Output destination
  const [saveAsTemplate, setSaveAsTemplate] = useState(true);
  const [assignToClient, setAssignToClient] = useState(false);
  const [clientId, setClientId] = useState<string>("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);

  const [generated, setGenerated] = useState<GeneratedProgram | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasRecoveredDraft, setHasRecoveredDraft] = useState(false);

  // Recover unsaved draft when dialog opens
  useEffect(() => {
    if (!open) return;
    try {
      const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const draft: PersistedDraft = JSON.parse(raw);
      // Expire drafts older than 2 hours
      if (Date.now() - draft.savedAt > 2 * 60 * 60 * 1000) {
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
        return;
      }
      setGenerated(draft.generated);
      setBuildMode(draft.buildMode);
      setPrompt(draft.prompt);
      setWeeks(draft.weeks);
      setDaysPerWeek(draft.daysPerWeek);
      setSelectedWorkoutIds(draft.selectedWorkoutIds);
      setStep("preview");
      setHasRecoveredDraft(true);
    } catch {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }, [open]);

  // Persist generated result so it survives accidental close / navigation
  useEffect(() => {
    if (!generated) return;
    const draft: PersistedDraft = {
      generated,
      buildMode,
      prompt,
      weeks,
      daysPerWeek,
      selectedWorkoutIds,
      savedAt: Date.now(),
    };
    try {
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // storage full or unavailable — ignore
    }
  }, [generated, buildMode, prompt, weeks, daysPerWeek, selectedWorkoutIds]);

  // Warn the user before leaving the page while a generation is mid-flight or unsaved
  useEffect(() => {
    if (!open) return;
    if (step !== "generating" && !generated) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [open, step, generated]);

  // Fetch trainer's workouts
  const { data: workouts } = useQuery({
    queryKey: ["program-builder-workouts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_plans")
        .select("id, name, category, difficulty")
        .eq("trainer_id", user?.id)
        .eq("is_template", false)
        .is("client_owner_id", null)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
  });

  // Fetch trainer's exercise library (used by full-build mode)
  const { data: exercises } = useQuery({
    queryKey: ["program-builder-exercises", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("id, name")
        .eq("trainer_id", user?.id)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && open && buildMode === "full_build",
  });

  // Fetch trainer's clients
  const { data: clients } = useQuery({
    queryKey: ["program-builder-clients", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_clients")
        .select("client_id, profiles!trainer_clients_client_id_fkey(id, full_name)")
        .eq("trainer_id", user?.id);
      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.profiles?.id,
        name: row.profiles?.full_name || "Unnamed",
      })).filter((c: any) => c.id);
    },
    enabled: !!user?.id && open,
  });

  const selectedWorkouts = useMemo(
    () => (workouts || []).filter((w) => selectedWorkoutIds.includes(w.id)),
    [workouts, selectedWorkoutIds]
  );

  const reset = () => {
    setStep("setup");
    setBuildMode("use_existing");
    setPrompt("");
    setSelectedWorkoutIds([]);
    setWeeks("6");
    setDaysPerWeek("4");
    setProgression("linear");
    setRestStrategy("auto");
    setFixedPattern([1, 3, 5]);
    setSaveAsTemplate(true);
    setAssignToClient(false);
    setClientId("");
    setGenerated(null);
    setHasRecoveredDraft(false);
    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      // Block close while a generation is actively running
      if (step === "generating") {
        toast({
          title: "Generation in progress",
          description: "Please wait — closing now would lose your program.",
        });
        return;
      }
      // Confirm if there's an unsaved generated program
      if (generated) {
        const ok = window.confirm(
          "You have an unsaved program. Close without saving?\n\n(It will still be recoverable next time you open the builder.)"
        );
        if (!ok) return;
      }
      reset();
    }
    onOpenChange(next);
  };

  const toggleWorkout = (id: string) => {
    setSelectedWorkoutIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const togglePatternDay = (day: number) => {
    setFixedPattern((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const canGenerate =
    prompt.trim().length > 0 &&
    (buildMode === "full_build"
      ? (exercises || []).length > 0
      : selectedWorkoutIds.length >= 1) &&
    (restStrategy === "auto" || fixedPattern.length === parseInt(daysPerWeek));

  const handleGenerate = async () => {
    setStep("generating");
    try {
      const body: any = {
        mode: buildMode === "full_build" ? "build_full_program" : "build_program",
        prompt,
        weeks: parseInt(weeks),
        days_per_week: parseInt(daysPerWeek),
        progression,
        rest_strategy: restStrategy,
        fixed_pattern: restStrategy === "fixed"
          ? fixedPattern.map((d) => DAYS_FULL.find((x) => x.value === d)?.label).filter(Boolean)
          : undefined,
      };
      if (buildMode === "full_build") {
        body.exercise_names = (exercises || []).map((e: any) => e.name);
      } else {
        body.workouts = selectedWorkouts.map((w) => ({
          name: w.name,
          category: w.category,
          difficulty: w.difficulty,
        }));
      }
      const { data, error } = await supabase.functions.invoke("ai-workout-builder", { body });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.result?.schedule) throw new Error("AI did not return a schedule");

      setGenerated(data.result);
      setStep("preview");
    } catch (err: any) {
      console.error("Program generation error:", err);
      toast({
        title: "Generation failed",
        description: err?.message || "Try again or refine your prompt",
        variant: "destructive",
      });
      setStep("setup");
    }
  };

  const handleSave = async () => {
    if (!generated || !user) return;
    if (!saveAsTemplate && !assignToClient) {
      toast({ title: "Pick at least one destination", variant: "destructive" });
      return;
    }
    if (assignToClient && !clientId) {
      toast({ title: "Pick a client to assign to", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      // Map workout_name → workout_plan_id
      const nameToId = new Map(selectedWorkouts.map((w) => [w.name.toLowerCase(), w.id]));

      // FULL-BUILD MODE: First create the AI-generated workouts in the library
      if (buildMode === "full_build" && generated.workouts && generated.workouts.length > 0) {
        // Build exercise name → id lookup from trainer's library
        const exerciseNameToId = new Map(
          (exercises || []).map((e: any) => [e.name.toLowerCase(), e.id])
        );

        for (const w of generated.workouts) {
          const estimatedDurationMinutes = estimateWorkoutDurationMinutes(w);

          // Insert workout_plan
          const { data: plan, error: planErr } = await supabase
            .from("workout_plans")
            .insert({
              name: w.name,
              description: w.description,
              category: w.category,
              difficulty: w.difficulty,
              duration_minutes: estimatedDurationMinutes,
              is_template: false,
              trainer_id: user.id,
            } as any)
            .select()
            .single();
          if (planErr) throw planErr;

          // Insert sections + exercises
          for (let sIdx = 0; sIdx < (w.sections || []).length; sIdx++) {
            const sec = w.sections[sIdx];
            const { data: section, error: secErr } = await supabase
              .from("workout_sections")
              .insert({
                workout_plan_id: plan.id,
                name: sec.section_name || sec.block_label,
                section_type: sec.section_type,
                order_index: sIdx,
                rounds: sec.rounds || 1,
              } as any)
              .select()
              .single();
            if (secErr) throw secErr;

            const exerciseRows = (sec.exercises || [])
              .map((ex, exIdx) => {
                const exId = exerciseNameToId.get(ex.exercise_name.toLowerCase());
                if (!exId) return null;
                const isTime = /sec|min|s$/i.test(ex.reps_or_time);
                return {
                  workout_plan_id: plan.id,
                  section_id: section.id,
                  exercise_id: exId,
                  order_index: exIdx,
                  sets: ex.sets,
                  reps: isTime ? null : null,
                  duration_seconds: isTime ? parseInt(ex.reps_or_time) || null : null,
                  rest_seconds: ex.rest_seconds,
                  notes: ex.notes || ex.reps_or_time || "",
                  exercise_type: "normal",
                };
              })
              .filter(Boolean);

            if (exerciseRows.length > 0) {
              const { error: exErr } = await supabase
                .from("workout_plan_exercises")
                .insert(exerciseRows as any);
              if (exErr) throw exErr;
            }
          }

          // Register in nameToId so schedule can link to it
          nameToId.set(w.name.toLowerCase(), plan.id);
        }
      }

      // 1) Save program template (if requested)
      let programId: string | null = null;
      if (saveAsTemplate) {
        const { data: program, error: progError } = await supabase
          .from("programs" as any)
          .insert({
            trainer_id: user.id,
            name: generated.program_name,
            description: generated.program_description,
            duration_weeks: parseInt(weeks),
            days_per_week: parseInt(daysPerWeek),
            status: "active",
          } as any)
          .select()
          .single();
        if (progError) throw progError;
        programId = (program as any).id;

        // Insert program_workouts rows
        const programWorkouts = generated.schedule
          .map((s, idx) => {
            const wid = nameToId.get(s.workout_name.toLowerCase());
            if (!wid) return null;
            return {
              program_id: programId,
              workout_id: wid,
              week_number: s.week_number,
              day_of_week: s.day_of_week,
              order_index: idx,
              notes: s.notes || null,
            };
          })
          .filter(Boolean);

        if (programWorkouts.length > 0) {
          const { error: pwError } = await supabase
            .from("program_workouts" as any)
            .insert(programWorkouts as any);
          if (pwError) throw pwError;
        }
      }

      // 2) Assign to client (if requested) — write client_workouts with scheduled_date
      let assignedCount = 0;
      if (assignToClient && clientId) {
        const start = new Date(startDate);
        // Align start to the chosen weekday of the first scheduled day if possible
        const startDow = start.getDay() === 0 ? 7 : start.getDay(); // 1..7 (Mon=1)

        const assignments = generated.schedule
          .map((s) => {
            const wid = nameToId.get(s.workout_name.toLowerCase());
            if (!wid) return null;
            // Days from start = (week-1)*7 + (day_of_week - startDow), wrap negatives
            const weekOffset = (s.week_number - 1) * 7;
            let dayDelta = s.day_of_week - startDow;
            if (dayDelta < 0) dayDelta += 7;
            const date = new Date(start);
            date.setDate(date.getDate() + weekOffset + dayDelta);
            return {
              client_id: clientId,
              workout_plan_id: wid,
              assigned_by: user.id,
              scheduled_date: date.toISOString().split("T")[0],
              notes: s.notes || null,
            };
          })
          .filter(Boolean);

        if (assignments.length > 0) {
          const { error: cwError } = await supabase
            .from("client_workouts")
            .insert(assignments as any);
          if (cwError) throw cwError;
          assignedCount = assignments.length;
        }
      }

      const parts: string[] = [];
      if (buildMode === "full_build" && generated.workouts) {
        parts.push(`${generated.workouts.length} workouts created`);
      }
      if (saveAsTemplate) parts.push("saved as template");
      if (assignedCount > 0) parts.push(`${assignedCount} workouts assigned`);
      toast({
        title: "Program created",
        description: parts.join(" • "),
      });

      // Clear the draft now that it's safely saved
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      setHasRecoveredDraft(false);

      onProgramCreated?.();
      handleClose(false);
    } catch (err: any) {
      console.error("Save program error:", err);
      toast({
        title: "Save failed",
        description: err?.message || "Could not save program",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Group preview by week
  const scheduleByWeek = useMemo(() => {
    if (!generated) return new Map<number, ScheduleItem[]>();
    const map = new Map<number, ScheduleItem[]>();
    generated.schedule.forEach((s) => {
      const arr = map.get(s.week_number) || [];
      arr.push(s);
      map.set(s.week_number, arr);
    });
    map.forEach((arr) => arr.sort((a, b) => a.day_of_week - b.day_of_week));
    return map;
  }, [generated]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Program Builder
          </DialogTitle>
          <DialogDescription>
            Turn your selected workouts into a multi-week schedule with progression and rest days.
          </DialogDescription>
        </DialogHeader>

        {step === "setup" && (
          <ScrollArea className="flex-1 pr-4 -mr-4">
            <div className="space-y-5">
              {/* Mode toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBuildMode("use_existing")}
                  className={`p-3 rounded-md border text-left transition ${
                    buildMode === "use_existing"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <Library className="h-4 w-4" />
                    Use my workouts
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Schedule workouts from your library
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setBuildMode("full_build")}
                  className={`p-3 rounded-md border text-left transition ${
                    buildMode === "full_build"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <Wand2 className="h-4 w-4" />
                    Let AI build everything
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    AI invents workouts + schedule from one prompt
                  </div>
                </button>
              </div>

              {/* Prompt */}
              <div className="space-y-2">
                <Label>Goal / Description</Label>
                <Textarea
                  placeholder={
                    buildMode === "full_build"
                      ? "e.g. Push / Pull / Legs split for an intermediate lifter, 4 weeks, focus on hypertrophy"
                      : "e.g. 6-week strength block using my existing workouts, conditioning on light days"
                  }
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Workout selection (use_existing mode only) */}
              {buildMode === "use_existing" ? (
                <div className="space-y-2">
                <Label>
                  Select Workouts ({selectedWorkoutIds.length} selected)
                </Label>
                <div className="border rounded-md max-h-48 overflow-y-auto p-2 space-y-1">
                  {(workouts || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground p-3 text-center">
                      No workouts found. Create some first.
                    </p>
                  ) : (
                    (workouts || []).map((w) => (
                      <label
                        key={w.id}
                        className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedWorkoutIds.includes(w.id)}
                          onCheckedChange={() => toggleWorkout(w.id)}
                        />
                        <Dumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 text-sm font-medium truncate">{w.name}</span>
                        {w.category && (
                          <Badge variant="outline" className="text-xs">{w.category}</Badge>
                        )}
                      </label>
                    ))
                  )}
                </div>
                </div>
              ) : (
                <div className="p-3 rounded-md border bg-muted/30 text-sm">
                  <div className="flex items-start gap-2">
                    <Wand2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium">AI will design the workouts for you</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Using your exercise library ({(exercises || []).length} exercises). New workouts will be saved to your library so you can edit and reuse them.
                      </div>
                      {(exercises || []).length === 0 && (
                        <div className="text-xs text-destructive mt-2">
                          No exercises in your library. Add some first on the Exercises page.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Select value={weeks} onValueChange={setWeeks}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[4, 5, 6, 7, 8].map((w) => (
                        <SelectItem key={w} value={String(w)}>{w} weeks</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Days / Week</Label>
                  <Select value={daysPerWeek} onValueChange={setDaysPerWeek}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4, 5, 6].map((d) => (
                        <SelectItem key={d} value={String(d)}>{d} days</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Progression */}
              <div className="space-y-2">
                <Label>Progression Style</Label>
                <RadioGroup value={progression} onValueChange={(v: any) => setProgression(v)}>
                  <div className="flex items-start gap-3 p-3 border rounded-md">
                    <RadioGroupItem value="linear" id="linear" className="mt-0.5" />
                    <label htmlFor="linear" className="flex-1 cursor-pointer">
                      <div className="font-medium text-sm">Linear</div>
                      <div className="text-xs text-muted-foreground">Add reps/sets/load each week</div>
                    </label>
                  </div>
                  <div className="flex items-start gap-3 p-3 border rounded-md">
                    <RadioGroupItem value="wave" id="wave" className="mt-0.5" />
                    <label htmlFor="wave" className="flex-1 cursor-pointer">
                      <div className="font-medium text-sm">Wave / Undulating</div>
                      <div className="text-xs text-muted-foreground">Cycle hard / medium / easy weeks</div>
                    </label>
                  </div>
                  <div className="flex items-start gap-3 p-3 border rounded-md">
                    <RadioGroupItem value="none" id="none" className="mt-0.5" />
                    <label htmlFor="none" className="flex-1 cursor-pointer">
                      <div className="font-medium text-sm">None — just rotate</div>
                      <div className="text-xs text-muted-foreground">Keep workouts consistent week to week</div>
                    </label>
                  </div>
                </RadioGroup>
              </div>

              {/* Rest day strategy */}
              <div className="space-y-2">
                <Label>Rest Day Placement</Label>
                <RadioGroup value={restStrategy} onValueChange={(v: any) => setRestStrategy(v)}>
                  <div className="flex items-start gap-3 p-3 border rounded-md">
                    <RadioGroupItem value="auto" id="auto" className="mt-0.5" />
                    <label htmlFor="auto" className="flex-1 cursor-pointer">
                      <div className="font-medium text-sm">Auto-placed by AI</div>
                      <div className="text-xs text-muted-foreground">AI spaces rest days for optimal recovery</div>
                    </label>
                  </div>
                  <div className="flex items-start gap-3 p-3 border rounded-md">
                    <RadioGroupItem value="fixed" id="fixed" className="mt-0.5" />
                    <div className="flex-1">
                      <label htmlFor="fixed" className="cursor-pointer">
                        <div className="font-medium text-sm">Fixed weekly pattern</div>
                        <div className="text-xs text-muted-foreground mb-2">Pick exactly {daysPerWeek} training days</div>
                      </label>
                      {restStrategy === "fixed" && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {DAYS_FULL.map((d) => (
                            <button
                              key={d.value}
                              type="button"
                              onClick={() => togglePatternDay(d.value)}
                              className={`px-3 py-1 rounded-md text-xs font-medium border transition ${
                                fixedPattern.includes(d.value)
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background hover:bg-muted"
                              }`}
                            >
                              {d.label.slice(0, 3)}
                            </button>
                          ))}
                        </div>
                      )}
                      {restStrategy === "fixed" && fixedPattern.length !== parseInt(daysPerWeek) && (
                        <p className="text-xs text-destructive mt-2">
                          Selected {fixedPattern.length}, need {daysPerWeek}
                        </p>
                      )}
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </ScrollArea>
        )}

        {step === "generating" && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Designing your program…</p>
              <p className="text-sm text-muted-foreground mt-1">
                {buildMode === "full_build"
                  ? `GPT-5 is inventing workouts and scheduling ${weeks} weeks`
                  : `GPT-5 is scheduling ${selectedWorkoutIds.length} workouts across ${weeks} weeks`}
              </p>
            </div>
          </div>
        )}

        {step === "preview" && generated && (
          <ScrollArea className="flex-1 pr-4 -mr-4">
            <div className="space-y-4">
              {hasRecoveredDraft && (
                <div className="p-3 rounded-md border border-primary/30 bg-primary/5 text-sm flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium">Recovered your last program</div>
                    <div className="text-xs text-muted-foreground">
                      Your previous generation was restored. Save it below or refine it again.
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
                      setHasRecoveredDraft(false);
                      reset();
                    }}
                    className="h-7 text-xs"
                  >
                    Discard
                  </Button>
                </div>
              )}
              <div className="p-4 bg-muted/50 rounded-md border">
                <h3 className="font-semibold text-lg">{generated.program_name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{generated.program_description}</p>
              </div>

              {/* Workouts the AI invented (full-build mode only) */}
              {buildMode === "full_build" && generated.workouts && generated.workouts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">
                      Workouts AI created ({generated.workouts.length})
                    </Label>
                    <Badge variant="secondary" className="text-xs">
                      Will be saved to your library
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {generated.workouts.map((w, idx) => {
                      const totalExercises = (w.sections || []).reduce(
                        (sum, s) => sum + (s.exercises?.length || 0),
                        0
                      );
                      return (
                        <Collapsible key={idx} className="border rounded-md">
                          <CollapsibleTrigger className="w-full px-3 py-2.5 flex items-center gap-2 text-sm hover:bg-muted/50 transition">
                            <Dumbbell className="h-4 w-4 text-primary shrink-0" />
                            <div className="flex-1 text-left min-w-0">
                              <div className="font-medium truncate">{w.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {totalExercises} exercises • {w.sections?.length || 0} blocks
                                {w.difficulty && ` • ${w.difficulty}`}
                              </div>
                            </div>
                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform [[data-state=open]>&]:rotate-180" />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="border-t bg-muted/20">
                            {w.description && (
                              <p className="px-3 pt-2 text-xs text-muted-foreground italic">
                                {w.description}
                              </p>
                            )}
                            <div className="p-3 space-y-3">
                              {(w.sections || []).map((sec, sIdx) => (
                                <div key={sIdx} className="space-y-1.5">
                                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    <span>{sec.block_label || sec.section_name}</span>
                                    {sec.section_type !== "straight_set" && (
                                      <Badge variant="outline" className="text-[10px] py-0 h-4">
                                        {sec.section_type}
                                      </Badge>
                                    )}
                                    {sec.rounds > 1 && (
                                      <span className="text-[10px]">× {sec.rounds} rounds</span>
                                    )}
                                  </div>
                                  <div className="space-y-1 pl-1">
                                    {(sec.exercises || []).map((ex, eIdx) => (
                                      <div
                                        key={eIdx}
                                        className="flex items-center gap-2 text-xs py-1 border-b border-border/40 last:border-0"
                                      >
                                        <span className="font-medium flex-1 truncate">
                                          {ex.exercise_name}
                                        </span>
                                        <span className="text-muted-foreground tabular-nums shrink-0">
                                          {ex.sets} × {ex.reps_or_time}
                                        </span>
                                        <span className="text-muted-foreground tabular-nums shrink-0 w-12 text-right">
                                          {ex.rest_seconds}s rest
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {Array.from(scheduleByWeek.entries()).map(([wk, items]) => (
                  <div key={wk} className="border rounded-md overflow-hidden">
                    <div className="bg-muted px-3 py-2 font-medium text-sm flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      Week {wk}
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {items.length} {items.length === 1 ? "session" : "sessions"}
                      </Badge>
                    </div>
                    <div className="divide-y">
                      {items.map((s, i) => (
                        <div key={i} className="px-3 py-2 flex items-center gap-3 text-sm">
                          <Badge variant="outline" className="w-12 justify-center text-xs shrink-0">
                            {DAY_LABELS[s.day_of_week]}
                          </Badge>
                          <Dumbbell className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium flex-1 truncate">{s.workout_name}</span>
                          {s.notes && (
                            <span className="text-xs text-muted-foreground italic truncate max-w-[40%]">
                              {s.notes}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Output destination */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Where should this go?</Label>

                <label className="flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/50">
                  <Checkbox
                    checked={saveAsTemplate}
                    onCheckedChange={(c) => setSaveAsTemplate(!!c)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">Save as Program Template</div>
                    <div className="text-xs text-muted-foreground">Reusable for any future client</div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/50">
                  <Checkbox
                    checked={assignToClient}
                    onCheckedChange={(c) => setAssignToClient(!!c)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-2">
                    <div>
                      <div className="font-medium text-sm">Assign to a client now</div>
                      <div className="text-xs text-muted-foreground">Schedules workouts on their calendar</div>
                    </div>
                    {assignToClient && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Select value={clientId} onValueChange={setClientId}>
                          <SelectTrigger><SelectValue placeholder="Choose client" /></SelectTrigger>
                          <SelectContent>
                            {(clients || []).map((c: any) => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {step === "setup" && (
            <>
              <Button variant="outline" onClick={() => handleClose(false)} className="sm:flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="sm:flex-1 gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Generate Program
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("setup")}
                className="sm:flex-1 gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Refine
              </Button>
              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={isSaving}
                className="sm:flex-1"
              >
                Regenerate
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || (!saveAsTemplate && !assignToClient)}
                className="sm:flex-1 gap-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Save Program
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}