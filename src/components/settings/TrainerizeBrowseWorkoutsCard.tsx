import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Dumbbell, ArrowLeft, ChevronRight, Clock, Flame, Footprints, MapPin, Repeat2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";

type TzUser = { id: number; name: string; email: string | null };
type TzPlan = { id: number; name: string; startDate?: string; endDate?: string };
type TzWorkout = { id: number; name: string; type?: string; instructions?: string };
type TzExercise = { name: string; sets?: number | string; reps?: number | string; weight?: string; rest?: string; notes?: string };
type TzCompleted = {
  id?: number;
  name: string;
  subtitle?: string | null;
  date?: string;
  duration?: string;
  distance?: string;
  calories?: string;
  steps?: string;
  sets?: string;
  reps?: string;
  type?: string;
  status?: string;
  detailRows?: Array<{ label: string; value: string }>;
};

async function invoke<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("trainerize-browse-workouts", {
    body: { action, ...body },
  });
  if (error) {
    const details = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
    throw new Error(details);
  }
  return data as T;
}

function extractExercises(detail: any): TzExercise[] {
  const w = detail?.body?.workout ?? detail?.workout ?? detail?.body ?? detail;
  const raw = w?.exercises ?? w?.exerciseList ?? [];
  return (Array.isArray(raw) ? raw : []).map((e: any) => ({
    name: e.name ?? e.exerciseName ?? e.def?.name ?? "Exercise",
    sets: e.sets ?? e.setCount ?? e.target?.sets,
    reps: e.reps ?? e.repCount ?? e.target?.reps,
    weight: e.weight ?? e.target?.weight,
    rest: e.rest ?? e.restTime,
    notes: e.instructions ?? e.notes,
  }));
}

function formatDuration(value: unknown, text?: unknown) {
  if (typeof text === "string" && text.trim()) return text;
  if (typeof value === "number" && Number.isFinite(value)) {
    const seconds = value > 1000 ? value : value * 60;
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return hrs > 0 ? `${hrs}h ${rem}m` : `${mins}m`;
  }
  if (typeof value === "string" && value.trim()) return value;
  return undefined;
}

function formatMetric(value: unknown, unit = "") {
  if (value === null || value === undefined || value === "") return undefined;
  return `${value}${unit ? ` ${unit}` : ""}`;
}

function buildDetailRows(detail: unknown): Array<{ label: string; value: string }> {
  if (!detail || typeof detail !== "object") return [];
  const hidden = new Set(["duration", "durationSeconds", "time", "timeSeconds", "durationText", "timeText", "distance", "actualDistance", "distanceUnit", "unitDistance", "calories", "caloriesBurned", "steps", "sets", "totalSets", "reps", "totalReps"]);
  return Object.entries(detail as Record<string, unknown>)
    .filter(([key, value]) => !hidden.has(key) && value !== null && value !== undefined && value !== "" && typeof value !== "object")
    .slice(0, 6)
    .map(([key, value]) => ({
      label: key.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase()),
      value: String(value),
    }));
}

export function TrainerizeBrowseWorkoutsCard() {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<TzUser[] | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [plans, setPlans] = useState<TzPlan[] | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<TzPlan | null>(null);
  const [workouts, setWorkouts] = useState<TzWorkout[] | null>(null);
  const [loadingWorkouts, setLoadingWorkouts] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<TzWorkout | null>(null);
  const [exercises, setExercises] = useState<TzExercise[] | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<TzCompleted[] | null>(null);
  const [loadingCompleted, setLoadingCompleted] = useState(false);

  const loadRoster = async () => {
    setLoadingUsers(true); setError(null);
    try {
      const res = await invoke<{ users: TzUser[] }>("roster");
      setUsers(res.users);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoadingUsers(false); }
  };

  useEffect(() => { if (open && !users) loadRoster(); }, [open]);

  const pickUser = async (idStr: string) => {
    setSelectedUserId(idStr);
    setPlans(null); setSelectedPlan(null); setWorkouts(null); setSelectedWorkout(null); setExercises(null);
    setCompleted(null);
    setLoadingPlans(true); setError(null);
    try {
      const res = await invoke<any>("plans", { userId: Number(idStr) });
      const raw = res?.body?.trainingPlans ?? res?.body?.plans ?? res?.body ?? [];
      const list: TzPlan[] = (Array.isArray(raw) ? raw : []).map((p: any) => ({
        id: Number(p.id ?? p.trainingPlanID),
        name: p.name ?? p.title ?? `Plan #${p.id}`,
        startDate: p.startDate, endDate: p.endDate,
      }));
      setPlans(list);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoadingPlans(false); }

    // Also fetch recent completed workouts in parallel
    setLoadingCompleted(true);
    try {
      const res = await invoke<any>("completed", { userId: Number(idStr) });
      const raw = res?.body?.workouts ?? res?.body?.activities ?? res?.body?.completedWorkouts ?? [];
      const list: TzCompleted[] = (Array.isArray(raw) ? raw : []).map((w: any) => {
        const dur = formatDuration(w.duration ?? w.durationSeconds ?? w.time, w.durationText);
        const distance = formatMetric(w.distance ?? w.actualDistance, w.distanceUnit ?? w.unitDistance);
        return {
          id: w.id ?? w.workoutID,
          name: w.name ?? w.workoutName ?? w.activityName ?? w.type ?? 'Workout',
          subtitle: w.subtitle,
          date: w.date ?? w.completedDate ?? w.startTime,
          duration: dur,
          distance,
          calories: formatMetric(w.calories ?? w.caloriesBurned, "cal"),
          steps: formatMetric(w.steps),
          sets: formatMetric(w.sets),
          reps: formatMetric(w.reps),
          type: w.type ?? w.activityType,
          status: w.status,
          detailRows: buildDetailRows(w.detail),
        };
      });
      setCompleted(list);
    } catch (e) { /* non-fatal */ }
    finally { setLoadingCompleted(false); }
  };

  const pickPlan = async (p: TzPlan) => {
    setSelectedPlan(p); setWorkouts(null); setSelectedWorkout(null); setExercises(null);
    setLoadingWorkouts(true); setError(null);
    try {
      const res = await invoke<any>("workouts", { userId: Number(selectedUserId), planId: p.id });
      const raw = res?.body?.workouts ?? res?.body ?? [];
      const list: TzWorkout[] = (Array.isArray(raw) ? raw : []).map((w: any) => ({
        id: Number(w.id ?? w.workoutID),
        name: w.name ?? w.title ?? `Workout #${w.id}`,
        type: w.type ?? w.workoutType,
        instructions: w.instructions,
      }));
      setWorkouts(list);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoadingWorkouts(false); }
  };

  const pickWorkout = async (w: TzWorkout) => {
    setSelectedWorkout(w); setExercises(null);
    setLoadingDetail(true); setError(null);
    try {
      const res = await invoke<any>("workoutDetail", { workoutId: w.id });
      setExercises(extractExercises(res));
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoadingDetail(false); }
  };

  const backToPlans = () => { setSelectedPlan(null); setWorkouts(null); setSelectedWorkout(null); setExercises(null); };
  const backToWorkouts = () => { setSelectedWorkout(null); setExercises(null); };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5" />
            Browse Trainerize Workouts
          </CardTitle>
          <CardDescription>
            Read-only view of any Trainerize client's assigned programs and workouts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setOpen(true)}>Open Browser</Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {(selectedPlan || selectedWorkout) && (
                <Button variant="ghost" size="icon" onClick={selectedWorkout ? backToWorkouts : backToPlans}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              {selectedWorkout ? selectedWorkout.name
                : selectedPlan ? selectedPlan.name
                : "Trainerize Workouts"}
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded p-2">{error}</div>
          )}

          {!selectedPlan && !selectedWorkout && (
            <div className="space-y-3">
              <label className="text-sm text-muted-foreground">Select a Trainerize client</label>
              {loadingUsers ? (
                <div className="flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading roster…</div>
              ) : (
                <Select value={selectedUserId} onValueChange={pickUser}>
                  <SelectTrigger><SelectValue placeholder="Choose a client" /></SelectTrigger>
                  <SelectContent>
                    {(users ?? []).map(u => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name}{u.email ? ` — ${u.email}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {loadingPlans && <div className="flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading plans…</div>}
              {plans && (
                <ScrollArea className="max-h-[55vh]">
                  <div className="space-y-4 pr-2">
                    {plans.length > 0 && (
                      <div>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Training Plans</div>
                        <div className="space-y-2">
                          {plans.map(p => (
                      <button key={p.id} onClick={() => pickPlan(p)}
                        className="w-full flex items-center justify-between rounded-lg border border-border bg-card p-3 hover:bg-accent text-left">
                        <div>
                          <div className="font-medium">{p.name}</div>
                          {(p.startDate || p.endDate) && (
                            <div className="text-xs text-muted-foreground">{p.startDate ?? "?"} → {p.endDate ?? "?"}</div>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-60" />
                      </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Recent Completed Workouts</div>
                      {loadingCompleted && (
                        <div className="flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
                      )}
                      {!loadingCompleted && (completed ?? []).length === 0 && (
                        <div className="text-sm text-muted-foreground">No recent workouts found.</div>
                      )}
                      <div className="space-y-2">
                        {(completed ?? []).map((w, i) => (
                          <div key={i} className="rounded-lg border border-border bg-card p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-medium">{w.name}</div>
                                {w.subtitle && <div className="text-xs text-muted-foreground mt-0.5">{w.subtitle}</div>}
                              </div>
                              {w.status && <span className="text-[10px] uppercase tracking-wide text-primary bg-primary/10 rounded-full px-2 py-1">{w.status}</span>}
                            </div>
                            <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1">
                              {w.date && <span>{new Date(w.date).toLocaleDateString()}</span>}
                              {w.duration && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{w.duration}</span>}
                              {w.distance && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{w.distance}</span>}
                              {w.calories && <span className="inline-flex items-center gap-1"><Flame className="h-3 w-3" />{w.calories}</span>}
                              {w.steps && <span className="inline-flex items-center gap-1"><Footprints className="h-3 w-3" />{w.steps}</span>}
                              {(w.sets || w.reps) && <span className="inline-flex items-center gap-1"><Repeat2 className="h-3 w-3" />{[w.sets && `${w.sets} sets`, w.reps && `${w.reps} reps`].filter(Boolean).join(" · ")}</span>}
                            </div>
                            {(w.detailRows ?? []).length > 0 && (
                              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                {w.detailRows!.map((row) => (
                                  <div key={row.label} className="rounded-md bg-muted/40 px-2 py-1.5">
                                    <div className="text-muted-foreground">{row.label}</div>
                                    <div className="font-medium">{row.value}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {plans.length === 0 && (completed ?? []).length === 0 && !loadingCompleted && (
                      <div className="text-sm text-muted-foreground">
                        This client has no assigned plans or recent workouts in Trainerize.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          {selectedPlan && !selectedWorkout && (
            <ScrollArea className="max-h-[65vh]">
              {loadingWorkouts ? (
                <div className="flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading workouts…</div>
              ) : (
                <div className="space-y-2 pr-2">
                  {(workouts ?? []).length === 0 && <div className="text-sm text-muted-foreground">No workouts in this plan.</div>}
                  {(workouts ?? []).map(w => (
                    <button key={w.id} onClick={() => pickWorkout(w)}
                      className="w-full flex items-center justify-between rounded-lg border border-border bg-card p-3 hover:bg-accent text-left">
                      <div>
                        <div className="font-medium">{w.name}</div>
                        {w.type && <div className="text-xs text-muted-foreground">{w.type}</div>}
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-60" />
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}

          {selectedWorkout && (
            <ScrollArea className="max-h-[65vh]">
              {loadingDetail ? (
                <div className="flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading exercises…</div>
              ) : (
                <div className="space-y-2 pr-2">
                  {(exercises ?? []).length === 0 && <div className="text-sm text-muted-foreground">No exercises returned.</div>}
                  {(exercises ?? []).map((ex, i) => (
                    <div key={i} className="rounded-lg border border-border bg-card p-3">
                      <div className="font-medium">{ex.name}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                        {ex.sets !== undefined && <span>Sets: {String(ex.sets)}</span>}
                        {ex.reps !== undefined && <span>Reps: {String(ex.reps)}</span>}
                        {ex.weight && <span>Weight: {ex.weight}</span>}
                        {ex.rest && <span>Rest: {ex.rest}</span>}
                      </div>
                      {ex.notes && <div className="text-xs mt-1">{ex.notes}</div>}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}