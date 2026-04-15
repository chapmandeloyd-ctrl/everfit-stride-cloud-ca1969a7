import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClientLayout } from "@/components/ClientLayout";
import { WorkoutSummary } from "@/components/WorkoutSummary";

export default function ClientWorkoutSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const { data: session, isLoading } = useQuery({
    queryKey: ["workout-session-detail", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("*, workout_plan:workout_plans(*, workout_sections(*, workout_plan_exercises(*, exercise:exercises(*))))")
        .eq("id", sessionId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });

  const { data: exerciseLogs } = useQuery({
    queryKey: ["workout-exercise-logs", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_exercise_logs")
        .select("*")
        .eq("session_id", sessionId)
        .order("set_number", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });

  if (isLoading || !session) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        </div>
      </ClientLayout>
    );
  }

  const workout = session.workout_plan as any;
  const transformedSections = workout?.workout_sections
    ?.sort((a: any, b: any) => a.order_index - b.order_index)
    .map((section: any) => ({
      id: section.id,
      name: section.name,
      section_type: section.section_type,
      rounds: section.rounds,
      work_seconds: section.work_seconds,
      rest_seconds: section.rest_seconds,
      exercises: section.workout_plan_exercises
        ?.sort((a: any, b: any) => a.order_index - b.order_index)
        .map((wpe: any) => ({
          id: wpe.id,
          exercise_id: wpe.exercise_id,
          exercise_name: wpe.exercise?.name,
          exercise_image: wpe.exercise?.image_url,
          sets: wpe.sets,
          reps: wpe.reps,
          duration_seconds: wpe.duration_seconds,
          rest_seconds: wpe.rest_seconds,
          tempo: wpe.tempo || "",
          notes: wpe.notes || "",
          weight_lbs: wpe.weight_lbs,
          rpe: wpe.rpe,
          distance: wpe.distance,
        })) || [],
    })) || [];

  // Rebuild setLogs from exercise_logs
  const setLogs: Record<string, { reps: string; weight: string; completed: boolean }> = {};
  if (exerciseLogs) {
    transformedSections.forEach((section: any, sIdx: number) => {
      const isGrouped = ["superset", "circuit"].includes(section.section_type);
      section.exercises.forEach((ex: any, eIdx: number) => {
        const exLogs = exerciseLogs.filter((l: any) => l.exercise_id === ex.exercise_id);
        if (isGrouped) {
          exLogs.forEach((log: any) => {
            const key = `${sIdx}-${eIdx}-${log.set_number}-1`;
            setLogs[key] = {
              reps: log.reps?.toString() || "-",
              weight: log.weight?.toString() || "-",
              completed: log.completed ?? true,
            };
          });
        } else {
          exLogs.forEach((log: any) => {
            const key = `${sIdx}-${eIdx}-1-${log.set_number}`;
            setLogs[key] = {
              reps: log.reps?.toString() || "-",
              weight: log.weight?.toString() || "-",
              completed: log.completed ?? true,
            };
          });
        }
      });
    });
  }

  return (
    <WorkoutSummary
      sessionId={session.id}
      workoutName={workout?.name || "Workout"}
      durationSeconds={session.duration_seconds || 0}
      startedAt={session.started_at || session.created_at}
      completedAt={session.completed_at || session.created_at}
      isPartial={session.is_partial || false}
      setLogs={setLogs}
      sections={transformedSections}
      onClose={() => navigate("/client/dashboard")}
    />
  );
}
