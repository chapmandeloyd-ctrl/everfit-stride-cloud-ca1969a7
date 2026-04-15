import { useNavigate } from "react-router-dom";
import { ClientLayout } from "@/components/ClientLayout";
import { useSavedWorkouts } from "@/hooks/useSavedWorkouts";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Dumbbell, ChevronRight, Bookmark, Plus, Clock, Play } from "lucide-react";
import { format } from "date-fns";

export default function ClientMyWorkouts() {
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();
  const { savedWorkouts, isLoading, toggleSave } = useSavedWorkouts();
  const clientId = useEffectiveClientId();
  const isResolvingClient = authLoading || !clientId;

  // Self-built workouts (where trainer_id = client's own id)
  const { data: myBuiltWorkouts = [], isLoading: builtLoading } = useQuery({
    queryKey: ["my-built-workouts", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_plans")
        .select(`
          id, name, category, difficulty, duration_minutes, created_at,
          workout_sections(
            id,
            workout_plan_exercises(id)
          )
        `)
        .eq("trainer_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  return (
    <ClientLayout>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">My Workouts</h1>
        </div>

        <Tabs defaultValue="built" className="space-y-4">
          <TabsList className="w-full">
            <TabsTrigger value="built" className="flex-1">Built by Me</TabsTrigger>
            <TabsTrigger value="saved" className="flex-1">Saved</TabsTrigger>
          </TabsList>

          <TabsContent value="built" className="space-y-2">
            {isResolvingClient || builtLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : myBuiltWorkouts.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <Dumbbell className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                <div>
                  <p className="text-lg font-semibold text-foreground">No workouts built yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create a workout in the builder and it will appear here.
                  </p>
                </div>
                <Button onClick={() => navigate("/client/wod-builder")} className="mt-2">
                  <Plus className="h-4 w-4 mr-2" />
                  Build a Workout
                </Button>
              </div>
            ) : (
              <>
                {myBuiltWorkouts.map((wod) => {
                  const totalEx = (wod.workout_sections || []).reduce(
                    (s: number, sec: any) => s + (sec.workout_plan_exercises?.length || 0), 0
                  );
                  return (
                    <Card key={wod.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        <button
                          onClick={() => navigate(`/client/workouts/${wod.id}`)}
                          className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Dumbbell className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{wod.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {wod.duration_minutes > 0 && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {wod.duration_minutes}m
                                </span>
                              )}
                              <span>{totalEx} exercise{totalEx !== 1 ? "s" : ""}</span>
                              <span>· {format(new Date(wod.created_at), "MMM d")}</span>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                        </button>
                      </CardContent>
                    </Card>
                  );
                })}
                <div className="pt-2">
                  <Button onClick={() => navigate("/client/wod-builder")} variant="outline" className="w-full gap-2">
                    <Plus className="h-4 w-4" />
                    Build New Workout
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="saved" className="space-y-2">
            {isResolvingClient || isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : savedWorkouts.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <Bookmark className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                <div>
                  <p className="text-lg font-semibold text-foreground">No saved workouts</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Bookmark workouts to save them here for quick access.
                  </p>
                </div>
              </div>
            ) : (
              savedWorkouts.map((sw: any) => {
                const plan = sw.workout_plans;
                return (
                  <Card key={sw.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <button
                        onClick={() => navigate(`/client/workouts/${sw.workout_plan_id}`)}
                        className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Dumbbell className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{plan?.name || "Workout"}</p>
                          <p className="text-xs text-muted-foreground">
                            {plan?.duration_minutes ? `${plan.duration_minutes} min` : ""}
                            {plan?.category ? ` · ${plan.category}` : ""}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSave.mutate(sw.workout_plan_id);
                          }}
                          className="p-2 text-primary hover:text-primary/70 transition-colors"
                        >
                          <Bookmark className="h-5 w-5 fill-current" />
                        </button>
                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      </button>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ClientLayout>
  );
}
