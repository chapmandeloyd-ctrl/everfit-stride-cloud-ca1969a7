import { useNavigate } from "react-router-dom";
import { ClientLayout } from "@/components/ClientLayout";
import { useSavedWorkouts } from "@/hooks/useSavedWorkouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Dumbbell, ChevronRight, Bookmark, Plus } from "lucide-react";

export default function ClientMyWorkouts() {
  const navigate = useNavigate();
  const { savedWorkouts, isLoading, toggleSave } = useSavedWorkouts();

  return (
    <ClientLayout>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/profile")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">My Workouts</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : savedWorkouts.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <Dumbbell className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <div>
              <p className="text-lg font-semibold text-foreground">No saved workouts yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create a workout in the builder and it will be saved here for you to reuse.
              </p>
            </div>
            <Button onClick={() => navigate("/client/wod-builder")} className="mt-2">
              <Plus className="h-4 w-4 mr-2" />
              Build a Workout
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {savedWorkouts.map((sw: any) => {
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
            })}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}