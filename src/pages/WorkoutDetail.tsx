import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Play, Clock, Dumbbell, Bookmark, CalendarPlus, Pencil, Trash2, Volume2, MessageSquare, Timer } from "lucide-react";
import { useSavedWorkouts } from "@/hooks/useSavedWorkouts";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useImpersonation } from "@/hooks/useImpersonation";
import { WorkoutPlayer, unlockAudioForMobile } from "@/components/WorkoutPlayer";
import { WorkoutSummary } from "@/components/WorkoutSummary";
import { awardBadges } from "@/hooks/useBadgeAwarder";
import { MoreVertical } from "lucide-react";
import { WorkoutActionsSheet } from "@/components/workout/WorkoutActionsSheet";
import { WorkoutScheduleSheet } from "@/components/workout/WorkoutScheduleSheet";
import { PostBuildChoiceSheet } from "@/components/workout/PostBuildChoiceSheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";

interface CompletionData {
  setLogs: Record<string, { reps: string; weight: string; completed: boolean }>;
  elapsedSeconds: number;
  startedAt: string;
  completionPercent?: number;
  caloriesEstimate?: number;
  skippedEvents?: any[];
  reason?: string;
}

export default function WorkoutDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userRole } = useAuth();
  const { isImpersonating } = useImpersonation();
  const effectiveClientId = useEffectiveClientId();
  const [isPlaying, setIsPlaying] = useState(searchParams.get("start") === "true");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeStartedAt, setActiveStartedAt] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const fromBuilder = searchParams.get("fromBuilder") === "true";
  const [postBuildOpen, setPostBuildOpen] = useState(fromBuilder);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [resumeData, setResumeData] = useState<{
    stepIdx: number;
    setLogs: Record<string, any>;
    elapsed: number;
    sessionId: string;
  } | null>(null);
  const [summaryData, setSummaryData] = useState<{
    sessionId: string;
    setLogs: Record<string, any>;
    durationSeconds: number;
    startedAt: string;
    completedAt: string;
    isPartial: boolean;
  } | null>(null);
  const progressSaveInFlightRef = useRef(false);
  const pendingStartRef = useRef(false);
  const isClient = userRole === "client" || isImpersonating;

  // Fetch client_workout record for this workout plan
  const { data: clientWorkout } = useQuery({
    queryKey: ["client-workout-for-plan", id, effectiveClientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_workouts")
        .select("*")
        .eq("workout_plan_id", id)
        .eq("client_id", effectiveClientId)
        .is("completed_at", null)
        .order("assigned_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!effectiveClientId && isClient,
  });

  // Check for in-progress (paused) session
  const { data: inProgressSession } = useQuery({
    queryKey: ["in-progress-session", id, effectiveClientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("workout_plan_id", id)
        .eq("client_id", effectiveClientId)
        .eq("status", "in_progress")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!effectiveClientId && isClient,
  });

  const { data: workout, isLoading } = useQuery({
    queryKey: ["workout-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_plans")
        .select(`
          *,
          workout_sections(
            *,
            workout_plan_exercises(
              *,
              exercise:exercises(*)
            )
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Transform data for WorkoutPlayer
  const transformedSections = workout?.workout_sections
    ?.sort((a: any, b: any) => a.order_index - b.order_index)
    .map((section: any) => ({
      id: section.id,
      name: section.name,
      section_type: section.section_type,
      rounds: section.rounds,
      work_seconds: section.work_seconds,
      rest_seconds: section.rest_seconds,
      rest_between_rounds_seconds: section.rest_between_rounds_seconds,
      notes: section.notes || "",
      intro_text: section.intro_text || null,
      rest_after_seconds: section.rest_after_seconds ?? null,
      exercises: section.workout_plan_exercises
        ?.sort((a: any, b: any) => a.order_index - b.order_index)
        .map((wpe: any) => ({
          id: wpe.id,
          exercise_id: wpe.exercise_id,
          exercise_name: wpe.exercise?.name,
          exercise_image: wpe.exercise?.image_url,
          exercise_video: wpe.exercise?.video_url,
          exercise_description: wpe.exercise?.description,
          is_unilateral: wpe.is_unilateral ?? wpe.exercise?.is_unilateral ?? false,
          sets: wpe.sets,
          reps: wpe.reps,
          duration_seconds: wpe.duration_seconds,
          rest_seconds: wpe.rest_seconds,
          tempo: wpe.tempo || "",
          notes: wpe.notes || "",
          weight_lbs: wpe.weight_lbs,
          rpe: wpe.rpe,
          distance: wpe.distance,
          band: wpe.recommended_band_level || null,
          side_mode: wpe.side_mode || null,
          form_cue_start: wpe.form_cue_start || null,
          form_cue_mid: wpe.form_cue_mid || null,
          form_cue_switch: wpe.form_cue_switch || null,
        })) || [],
    })) || [];

  const totalExercises = transformedSections.reduce(
    (sum: number, section: any) => sum + section.exercises.length * section.rounds,
    0
  );

  // Calculate true duration from actual exercise data (same formula as WorkoutPlayer)
  const calculatedTotalSeconds = transformedSections.reduce((acc: number, section: any) => {
    const isGrouped = ["superset", "circuit"].includes(section.section_type);
    if (isGrouped) {
      section.exercises.forEach((ex: any) => { acc += (ex.duration_seconds || 45) * section.rounds; });
      const exRestTotal = section.exercises.reduce((sum: number, ex: any) => sum + (ex.rest_seconds || 0), 0);
      acc += exRestTotal * section.rounds;
      acc += (section.rest_between_rounds_seconds || 60) * Math.max(0, section.rounds - 1);
    } else {
      section.exercises.forEach((ex: any) => {
        acc += ((ex.duration_seconds || 30) + (ex.rest_seconds || 30)) * (ex.sets || 1);
      });
    }
    return acc;
  }, 0);
  const calculatedMinutes = Math.ceil(calculatedTotalSeconds / 60);
  // Prefer a duration stated in the workout name (matches the library card)
  const namedMinutes = workout?.name?.match(/\b(\d+)\s*[- ]?\s*min(?:ute)?s?\b/i);
  const displayedMinutes = namedMinutes ? Number(namedMinutes[1]) : calculatedMinutes;

  const saveSession = async (data: CompletionData, isPartial: boolean) => {
    const completedAt = new Date().toISOString();

    // Use existing active session if available, otherwise create new one
    let sessionId = activeSessionId;
    const extras: Record<string, any> = {
      completion_percentage: data.completionPercent ?? (isPartial ? 0 : 100),
      calories_estimate: data.caloriesEstimate ?? null,
      incomplete_reason: isPartial ? data.reason ?? null : null,
      skipped_events: data.skippedEvents ?? [],
    };
    if (sessionId) {
      const { error: updateError } = await supabase
        .from("workout_sessions")
        .update({
          completed_at: completedAt,
          duration_seconds: data.elapsedSeconds,
          is_partial: isPartial,
          status: isPartial ? "partial" : "completed",
          ...extras,
        } as never)
        .eq("id", sessionId);
      if (updateError) throw updateError;
    } else {
      const { data: session, error: sessionError } = await supabase
        .from("workout_sessions")
        .insert({
          client_workout_id: clientWorkout?.id || null,
          client_id: effectiveClientId,
          workout_plan_id: id,
          started_at: data.startedAt,
          completed_at: completedAt,
          duration_seconds: data.elapsedSeconds,
          is_partial: isPartial,
          status: isPartial ? "partial" : "completed",
          ...extras,
        } as never)
        .select()
        .single();
      if (sessionError) throw sessionError;
      sessionId = (session as any).id;
    }


    // Save exercise logs
    const logs: any[] = [];
    transformedSections.forEach((section: any, sIdx: number) => {
      const isGrouped = ["superset", "circuit"].includes(section.section_type);
      section.exercises.forEach((ex: any, eIdx: number) => {
        if (isGrouped) {
          for (let r = 1; r <= section.rounds; r++) {
            const key = `${sIdx}-${eIdx}-${r}-1`;
            const log = data.setLogs[key];
            if (log) {
              logs.push({
                session_id: sessionId,
                exercise_id: ex.exercise_id,
                set_number: r,
                reps: log.reps ? parseInt(log.reps) : null,
                weight: log.weight ? parseFloat(log.weight) : null,
                completed: log.completed,
              });
            }
          }
        } else {
          const totalSets = ex.sets || 1;
          for (let s = 1; s <= totalSets; s++) {
            const key = `${sIdx}-${eIdx}-1-${s}`;
            const log = data.setLogs[key];
            if (log) {
              logs.push({
                session_id: sessionId,
                exercise_id: ex.exercise_id,
                set_number: s,
                reps: log.reps ? parseInt(log.reps) : null,
                weight: log.weight ? parseFloat(log.weight) : null,
                completed: log.completed,
              });
            }
          }
        }
      });
    });

    if (logs.length > 0) {
      await supabase.from("workout_exercise_logs").insert(logs);
    }

    // Mark client_workout as completed
    if (clientWorkout?.id && !isPartial) {
      await supabase
        .from("client_workouts")
        .update({ completed_at: completedAt })
        .eq("id", clientWorkout.id);
    }

    // Award badges
    await awardBadges(effectiveClientId!, sessionId!, workout?.difficulty);

    return { sessionId: sessionId!, completedAt };
  };

  const handleComplete = async (data: CompletionData) => {
    setIsPlaying(false);
    if (!isClient) {
      navigate("/workouts");
      return;
    }
    try {
      const result = await saveSession(data, false);
      setSummaryData({
        sessionId: result.sessionId,
        setLogs: data.setLogs,
        durationSeconds: data.elapsedSeconds,
        startedAt: data.startedAt,
        completedAt: result.completedAt,
        isPartial: false,
      });
    } catch (err) {
      console.error("Failed to save session:", err);
      navigate("/client/dashboard");
    }
  };

  const handleEndEarly = async (data: CompletionData) => {
    setIsPlaying(false);
    if (!isClient) {
      navigate("/workouts");
      return;
    }
    try {
      const result = await saveSession(data, true);
      setSummaryData({
        sessionId: result.sessionId,
        setLogs: data.setLogs,
        durationSeconds: data.elapsedSeconds,
        startedAt: data.startedAt,
        completedAt: result.completedAt,
        isPartial: true,
      });
    } catch (err) {
      console.error("Failed to save session:", err);
      navigate("/client/dashboard");
    }
  };

  const handleDiscard = () => {
    setIsPlaying(false);
    // Delete the active session (either freshly created or previously in-progress)
    const idToDelete = activeSessionId || inProgressSession?.id;
    if (idToDelete) {
      supabase.from("workout_sessions").delete().eq("id", idToDelete).then(() => {});
    }
    setActiveSessionId(null);
    setActiveStartedAt(null);
    navigate(isClient ? "/client/dashboard" : "/workouts");
  };

  const handleSaveForLater = async (data: { setLogs: Record<string, any>; elapsedSeconds: number; startedAt: string; stepIdx: number; completionPercent: number }) => {
    setIsPlaying(false);
    try {
      const existingId = activeSessionId || inProgressSession?.id;
      if (existingId) {
        // Update existing session
        await supabase.from("workout_sessions").update({
          duration_seconds: data.elapsedSeconds,
          resume_section_index: data.stepIdx,
          resume_set_logs: data.setLogs as any,
          completion_percentage: data.completionPercent,
          status: "in_progress",
        }).eq("id", existingId);
      } else {
        // Fallback: create new in-progress session
        await supabase.from("workout_sessions").insert({
          client_workout_id: clientWorkout?.id || null,
          client_id: effectiveClientId,
          workout_plan_id: id,
          started_at: data.startedAt,
          duration_seconds: data.elapsedSeconds,
          is_partial: true,
          status: "in_progress",
          resume_section_index: data.stepIdx,
          resume_set_logs: data.setLogs as any,
          completion_percentage: data.completionPercent,
        });
      }
      navigate("/client/dashboard");
    } catch (err) {
      console.error("Failed to save for later:", err);
      navigate("/client/dashboard");
    }
  };

  // Create an in-progress session immediately when starting a workout
  const createActiveSession = useCallback(async () => {
    if (!isClient || !effectiveClientId || !id || pendingStartRef.current) return null;
    pendingStartRef.current = true;
    const startedAt = new Date().toISOString();
    try {
      const { data: session } = await supabase
        .from("workout_sessions")
        .insert({
          client_workout_id: clientWorkout?.id || null,
          client_id: effectiveClientId,
          workout_plan_id: id,
          started_at: startedAt,
          is_partial: true,
          status: "in_progress",
          completion_percentage: 0,
        })
        .select("id")
        .single();
      if (session) {
        setActiveSessionId(session.id);
        setActiveStartedAt(startedAt);
        return { sessionId: session.id, startedAt };
      }
    } catch (err) {
      console.error("Failed to create active session:", err);
    } finally {
      pendingStartRef.current = false;
    }
    return null;
  }, [clientWorkout?.id, effectiveClientId, id, isClient]);

  const handleProgressSave = useCallback(async (data: { setLogs: Record<string, any>; elapsedSeconds: number; startedAt: string; stepIdx: number; completionPercent: number }) => {
    if (!isClient || progressSaveInFlightRef.current) return;
    progressSaveInFlightRef.current = true;

    try {
      let sessionId = activeSessionId || inProgressSession?.id;
      if (!sessionId) {
        const created = await createActiveSession();
        sessionId = created?.sessionId || null;
      }
      if (!sessionId) return;

      await supabase.from("workout_sessions").update({
        duration_seconds: data.elapsedSeconds,
        resume_section_index: data.stepIdx,
        resume_set_logs: data.setLogs as any,
        completion_percentage: data.completionPercent,
        status: "in_progress",
      }).eq("id", sessionId);
    } finally {
      progressSaveInFlightRef.current = false;
    }
  }, [activeSessionId, createActiveSession, inProgressSession?.id, isClient]);

  useEffect(() => {
    if (isPlaying && isClient && !activeSessionId && !inProgressSession?.id) {
      void createActiveSession();
    }
  }, [activeSessionId, createActiveSession, inProgressSession?.id, isClient, isPlaying]);

  const handleResume = () => {
    if (inProgressSession) {
      const savedLogs = (inProgressSession as any).resume_set_logs || {};
      setResumeData({
        stepIdx: (inProgressSession as any).resume_section_index || 0,
        setLogs: savedLogs,
        elapsed: inProgressSession.duration_seconds || 0,
        sessionId: inProgressSession.id,
      });
      setActiveSessionId(inProgressSession.id);
      setActiveStartedAt(inProgressSession.started_at);
    }
    setIsPlaying(true);
  };

  const handleExit = () => {
    setIsPlaying(false);
  };

  const handleDeleteSchedule = async () => {
    if (!clientWorkout?.id) {
      setConfirmDeleteOpen(false);
      return;
    }
    try {
      const { error } = await supabase
        .from("client_workouts")
        .delete()
        .eq("id", clientWorkout.id);
      if (error) throw error;
      toast("Workout removed from your calendar");
      queryClient.invalidateQueries({ queryKey: ["agenda-workouts"] });
      queryClient.invalidateQueries({ queryKey: ["client-workout-for-plan"] });
      navigate("/client/calendar");
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't delete");
    } finally {
      setConfirmDeleteOpen(false);
    }
  };

  const handleEditWorkout = () => {
    // Edit in WOD Builder, in place — pass workout plan id so builder can hydrate.
    navigate(`/client/wod-builder?editId=${id}`);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading workout...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!workout) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Workout not found</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            Go Back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Show summary after completion
  if (summaryData) {
    return (
      <WorkoutSummary
        sessionId={summaryData.sessionId}
        workoutName={workout.name}
        durationSeconds={summaryData.durationSeconds}
        startedAt={summaryData.startedAt}
        completedAt={summaryData.completedAt}
        isPartial={summaryData.isPartial}
        setLogs={summaryData.setLogs}
        sections={transformedSections}
        onClose={() => navigate("/client/dashboard")}
      />
    );
  }

  // Show workout player when playing
  if (isPlaying) {
    return (
      <WorkoutPlayer
        workoutName={workout.name}
        sections={transformedSections}
        onComplete={handleComplete}
        onEndEarly={handleEndEarly}
        onDiscard={handleDiscard}
        onExit={handleExit}
        onSaveForLater={isClient ? handleSaveForLater : undefined}
        onProgressSave={isClient ? handleProgressSave : undefined}
        resumeFromStep={resumeData?.stepIdx}
        resumeSetLogs={resumeData?.setLogs}
        resumeElapsed={resumeData?.elapsed}
        activeSessionId={activeSessionId}
        dbStartedAt={activeStartedAt}
        coachVoiceId={(workout as any).coach_voice_id || null}
        outroText={(workout as any).outro_text || null}
      />
    );
  }

  // Show workout preview
  const Layout = isClient ? ClientLayout : DashboardLayout;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to workouts
        </button>

        {/* Hero header */}
        <header className="bg-card border border-border rounded-2xl overflow-hidden">
          {workout.image_url && (
            <div className="relative w-full aspect-[16/9] bg-background overflow-hidden grid place-items-center">
              <img src={workout.image_url} alt={workout.name} className="w-full h-full object-contain bg-background" />
            </div>
          )}
          <div className="p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-bold italic uppercase tracking-tighter break-words">{workout.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {workout.difficulty && (
                  <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs capitalize">{workout.difficulty}</Badge>
                )}
                {workout.category && (
                  <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs capitalize">{workout.category}</Badge>
                )}
              </div>
              {workout.description && <p className="text-sm text-muted-foreground mt-3">{workout.description}</p>}
            </div>
            <div className="w-full sm:w-auto shrink-0 flex flex-col gap-2">
              {inProgressSession && isClient ? (
                <>
                  <button
                    onClick={() => { unlockAudioForMobile(); handleResume(); }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold uppercase tracking-wider text-sm px-6 py-3 rounded-full hover:scale-[1.02] active:scale-[0.98] transition-transform"
                  >
                    <Play className="h-4 w-4 fill-current" /> Resume ({inProgressSession.completion_percentage || 0}%)
                  </button>
                  <button
                    onClick={async () => { unlockAudioForMobile(); await createActiveSession(); setIsPlaying(true); }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-secondary border border-border font-bold uppercase tracking-wider text-xs px-6 py-2.5 rounded-full"
                  >
                    Start Fresh
                  </button>
                </>
              ) : (
                <button
                  onClick={async () => { unlockAudioForMobile(); await createActiveSession(); setIsPlaying(true); }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold uppercase tracking-wider text-sm px-6 py-3 rounded-full hover:scale-[1.02] active:scale-[0.98] transition-transform"
                >
                  <Play className="h-4 w-4 fill-current" /> Start Workout
                </button>
              )}
              {isClient && effectiveClientId && (
                <button
                  onClick={() => setScheduleOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-secondary border border-border font-bold uppercase tracking-wider text-xs px-6 py-2.5 rounded-full"
                >
                  <CalendarPlus className="h-4 w-4" /> Schedule
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Summary card */}
        <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold">est. {displayedMinutes}m</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Dumbbell className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold">{totalExercises} Exercise{totalExercises === 1 ? "" : "s"}</span>
          </div>
        </section>

        {isClient && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleEditWorkout}
              className="flex items-center gap-1.5 bg-secondary border border-border text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-full"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            <button
              onClick={() => setScheduleOpen(true)}
              className="flex items-center gap-1.5 bg-secondary border border-border text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-full"
            >
              <CalendarPlus className="h-3.5 w-3.5" /> Assign
            </button>
            <button
              onClick={() => setConfirmDeleteOpen(true)}
              className="flex items-center gap-1.5 bg-secondary border border-border text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-full text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        )}

        {/* Blocks */}
        {transformedSections.map((section: any, sIdx: number) => (
          <section key={section.id} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4 gap-3">
              <h2 className="text-2xl font-bold italic uppercase tracking-tighter min-w-0 break-words">{section.name}</h2>
              <div className="flex items-center gap-2 shrink-0">
                {section.section_type && (
                  <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs capitalize">{section.section_type}</Badge>
                )}
                {section.rounds > 0 && (
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">{section.rounds} Rounds</Badge>
                )}
              </div>
            </div>

            {section.intro_text && section.intro_text.trim() && (
              <div className="mb-4 rounded-xl border border-primary/40 bg-primary/5 p-3">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1">
                  <Volume2 className="h-3.5 w-3.5" /> Coach reads aloud
                </div>
                <p className="text-sm text-foreground/90 leading-snug whitespace-pre-wrap">{section.intro_text}</p>
              </div>
            )}

            <div className="divide-y divide-border">
              {section.exercises.map((exercise: any) => {
                const cues = [exercise.form_cue_start, exercise.form_cue_mid].filter(
                  (c: any) => !!c && String(c).trim().length > 0
                );
                return (
                  <div key={exercise.id} className="py-3 first:pt-0 last:pb-0 space-y-2">
                    <div className="flex items-center gap-4">
                      {exercise.exercise_image ? (
                        <img
                          src={exercise.exercise_image}
                          alt={exercise.exercise_name}
                          className="h-16 w-16 rounded-xl object-contain bg-secondary shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-xl bg-secondary grid place-items-center shrink-0">
                          <Dumbbell className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-base font-bold truncate">{exercise.exercise_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {exercise.sets && `${exercise.sets} sets`}
                          {exercise.reps && ` · ${exercise.reps} reps`}
                          {exercise.duration_seconds && ` · ${exercise.duration_seconds >= 60 ? `${Math.round(exercise.duration_seconds / 60)}min` : `${exercise.duration_seconds}s`} work`}
                          {exercise.rest_seconds ? ` · ${exercise.rest_seconds >= 60 ? `${Math.round(exercise.rest_seconds / 60)}min` : `${exercise.rest_seconds}s`} rest` : ""}
                          {exercise.weight_lbs ? ` · ${exercise.weight_lbs} lbs` : ""}
                          {exercise.tempo ? ` · Tempo ${exercise.tempo}` : ""}
                        </div>
                      </div>
                    </div>
                    {cues.length > 0 && (
                      <div className="ml-20 space-y-1">
                        {cues.map((c: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                            <span className="leading-snug">{c}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {exercise.notes && (
                      <p className="ml-20 text-xs text-muted-foreground">{exercise.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {section.rest_after_seconds > 0 && sIdx < transformedSections.length - 1 && (
              <div className="mt-4 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground border-t border-border pt-3">
                <Timer className="h-3.5 w-3.5" />
                {section.rest_after_seconds >= 60 ? `${Math.round(section.rest_after_seconds / 60)} min` : `${section.rest_after_seconds}s`} rest before next block
              </div>
            )}
          </section>
        ))}

        {transformedSections.length === 0 && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center text-sm text-muted-foreground">
            No exercises in this workout.
          </div>
        )}

        {/* Video Preview */}
        {workout.video_url && (
          <section className="bg-card border border-border rounded-2xl p-5">
            <h2 className="text-xl font-bold italic uppercase tracking-tighter mb-3">Workout Demo</h2>
            <div className="aspect-video rounded-xl overflow-hidden bg-background">
              <video src={workout.video_url} controls className="w-full h-full object-contain" />
            </div>
          </section>
        )}
      </div>

      {isClient && effectiveClientId && id && (
        <>
          <PostBuildChoiceSheet
            open={postBuildOpen}
            onOpenChange={setPostBuildOpen}
            onStartNow={async () => {
              unlockAudioForMobile();
              await createActiveSession();
              setIsPlaying(true);
            }}
            onSaveForLater={() => {
              toast("Saved to your library");
              navigate("/client/my-workouts");
            }}
            onSchedule={() => setScheduleOpen(true)}
          />

          <WorkoutActionsSheet
            open={actionsOpen}
            onOpenChange={setActionsOpen}
            onMove={() => setScheduleOpen(true)}
            onEdit={handleEditWorkout}
            onDelete={() => setConfirmDeleteOpen(true)}
            canMoveOrDelete={!!clientWorkout?.id}
          />

          <WorkoutScheduleSheet
            open={scheduleOpen}
            onOpenChange={setScheduleOpen}
            clientId={effectiveClientId}
            workoutPlanId={id}
            existingClientWorkoutId={clientWorkout?.id ?? null}
            initialDate={clientWorkout?.scheduled_date ? new Date(clientWorkout.scheduled_date + "T00:00:00") : new Date()}
          />

          <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this workout?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove "{workout?.name}" from your calendar. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteSchedule}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </Layout>
  );
}
