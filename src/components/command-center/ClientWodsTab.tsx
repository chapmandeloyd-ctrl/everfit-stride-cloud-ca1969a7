import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Copy, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ClientWodsTabProps {
  clientId: string;
  trainerId: string;
}

export function ClientWodsTab({ clientId, trainerId }: ClientWodsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Client-built workouts: workout_plans where trainer_id = clientId (client creates as "trainer_id" = their own id)
  const { data: clientWods = [], isLoading } = useQuery({
    queryKey: ["client-wods", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_plans")
        .select(`
          id, name, category, difficulty, duration_minutes, created_at,
          workout_sections(
            id, name, block_type,
            workout_plan_exercises(
              id, exercise_id, sets, reps, rest_seconds, order_index, notes,
              weight_lbs, tempo, rpe, distance, detail_fields,
              exercises(name, image_url)
            )
          )
        `)
        .eq("trainer_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  const copyToLibrary = useMutation({
    mutationFn: async (wod: any) => {
      // Create a copy under the trainer's ID
      const { data: newPlan, error: planError } = await supabase
        .from("workout_plans")
        .insert({
          name: `${wod.name} (from client)`,
          category: wod.category,
          difficulty: wod.difficulty,
          duration_minutes: wod.duration_minutes,
          trainer_id: trainerId,
        })
        .select()
        .single();
      if (planError) throw planError;

      // Copy sections and exercises
      for (const section of (wod.workout_sections || [])) {
        const { data: newSection, error: secError } = await supabase
          .from("workout_sections")
          .insert({
            workout_plan_id: newPlan.id,
            name: section.name,
            block_type: section.block_type,
            order_index: 0,
          })
          .select()
          .single();
        if (secError) throw secError;

        const exercises = (section.workout_plan_exercises || []).map((ex: any) => ({
          workout_plan_id: newPlan.id,
          section_id: newSection.id,
          exercise_id: ex.exercise_id,
          sets: ex.sets,
          reps: ex.reps,
          rest_seconds: ex.rest_seconds,
          order_index: ex.order_index,
          notes: ex.notes,
          weight_lbs: ex.weight_lbs,
          tempo: ex.tempo,
          rpe: ex.rpe,
          distance: ex.distance,
          detail_fields: ex.detail_fields,
        }));

        if (exercises.length > 0) {
          const { error: exError } = await supabase
            .from("workout_plan_exercises")
            .insert(exercises);
          if (exError) throw exError;
        }
      }
      return newPlan;
    },
    onSuccess: () => {
      toast({ title: "Copied!", description: "Workout added to your library." });
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (clientWods.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <Dumbbell className="h-12 w-12 text-muted-foreground/30 mx-auto" />
        <p className="text-lg font-semibold text-foreground">No self-built workouts yet</p>
        <p className="text-sm text-muted-foreground">
          When this client creates workouts in their WOD Builder, they'll appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{clientWods.length} workout{clientWods.length !== 1 ? "s" : ""} built by this client</p>
      {clientWods.map((wod) => {
        const totalExercises = (wod.workout_sections || []).reduce(
          (sum: number, s: any) => sum + (s.workout_plan_exercises?.length || 0), 0
        );
        return (
          <Card key={wod.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Dumbbell className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{wod.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {wod.duration_minutes > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {wod.duration_minutes}m
                        </span>
                      )}
                      <span>{totalExercises} exercise{totalExercises !== 1 ? "s" : ""}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{wod.category}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {format(new Date(wod.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 gap-1.5"
                  onClick={() => copyToLibrary.mutate(wod)}
                  disabled={copyToLibrary.isPending}
                >
                  {copyToLibrary.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                  Copy
                </Button>
              </div>
              {/* Exercise list preview */}
              <div className="mt-3 space-y-1 pl-[52px]">
                {(wod.workout_sections || []).flatMap((s: any) => s.workout_plan_exercises || []).slice(0, 5).map((ex: any) => (
                  <div key={ex.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                    <span className="truncate">{ex.exercises?.name || "Exercise"}</span>
                    <span className="text-muted-foreground/50">{ex.sets}×{ex.reps}</span>
                  </div>
                ))}
                {(wod.workout_sections || []).reduce((s: number, sec: any) => s + (sec.workout_plan_exercises?.length || 0), 0) > 5 && (
                  <p className="text-[10px] text-muted-foreground/40 pl-3">
                    +{(wod.workout_sections || []).reduce((s: number, sec: any) => s + (sec.workout_plan_exercises?.length || 0), 0) - 5} more
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
