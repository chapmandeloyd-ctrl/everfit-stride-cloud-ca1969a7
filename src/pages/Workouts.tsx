import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, Clock, Users, Copy, Edit, Trash2, BookTemplate, Dumbbell, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

import { SaveAsTemplateDialog } from "@/components/SaveAsTemplateDialog";
import { AIProgramBuilderDialog } from "@/components/AIProgramBuilderDialog";

const workoutTemplates = [
  {
    id: 1,
    name: "Full Body Strength",
    exercises: 8,
    duration: "45 min",
    difficulty: "Intermediate",
    assignedTo: 12,
    category: "Strength",
  },
  {
    id: 2,
    name: "HIIT Cardio Blast",
    exercises: 6,
    duration: "30 min",
    difficulty: "Advanced",
    assignedTo: 8,
    category: "Cardio",
  },
  {
    id: 3,
    name: "Upper Body Power",
    exercises: 10,
    duration: "60 min",
    difficulty: "Advanced",
    assignedTo: 15,
    category: "Strength",
  },
  {
    id: 4,
    name: "Core & Stability",
    exercises: 12,
    duration: "35 min",
    difficulty: "Beginner",
    assignedTo: 20,
    category: "Core",
  },
  {
    id: 5,
    name: "Lower Body Hypertrophy",
    exercises: 9,
    duration: "55 min",
    difficulty: "Intermediate",
    assignedTo: 10,
    category: "Strength",
  },
  {
    id: 6,
    name: "Mobility & Recovery",
    exercises: 8,
    duration: "25 min",
    difficulty: "Beginner",
    assignedTo: 25,
    category: "Recovery",
  },
];

const difficultyColors = {
  Beginner: "bg-success/10 text-success",
  Intermediate: "bg-accent/10 text-accent",
  Advanced: "bg-destructive/10 text-destructive",
};

const getDisplayedDuration = (name: string, savedDuration: number | null) => {
  const namedDuration = name.match(/\b(\d+)\s*[- ]?\s*min(?:ute)?s?\b/i);
  return namedDuration ? Number(namedDuration[1]) : savedDuration;
};

export default function Workouts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<string | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [workoutToTemplate, setWorkoutToTemplate] = useState<{ id: string; name: string } | null>(null);
  const [programBuilderOpen, setProgramBuilderOpen] = useState(false);

  // Fetch workout plans from database
  const { data: workoutPlans, isLoading } = useQuery({
    queryKey: ["workout-plans", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_plans")
        .select(`
          *,
          workout_plan_exercises(count)
        `)
        .eq("trainer_id", user?.id)
        .eq("is_template", false)
        .is("client_owner_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (workoutId: string) => {
      const { error } = await supabase
        .from("workout_plans")
        .delete()
        .eq("id", workoutId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-plans"] });
      toast({
        title: "Success",
        description: "Workout deleted successfully",
      });
      setDeleteDialogOpen(false);
      setWorkoutToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete workout",
        variant: "destructive",
      });
      console.error("Error deleting workout:", error);
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async (workoutId: string) => {
      // Get the workout plan
      const { data: workout, error: workoutError } = await supabase
        .from("workout_plans")
        .select("*")
        .eq("id", workoutId)
        .single();

      if (workoutError) throw workoutError;

      // Create duplicate workout
      const { data: newWorkout, error: newWorkoutError } = await supabase
        .from("workout_plans")
        .insert({
          name: `${workout.name} (Copy)`,
          description: workout.description,
          category: workout.category,
          difficulty: workout.difficulty,
          duration_minutes: workout.duration_minutes,
          trainer_id: user?.id,
        })
        .select()
        .single();

      if (newWorkoutError) throw newWorkoutError;

      // Get exercises from original workout
      const { data: exercises, error: exercisesError } = await supabase
        .from("workout_plan_exercises")
        .select("*")
        .eq("workout_plan_id", workoutId);

      if (exercisesError) throw exercisesError;

      // Copy exercises to new workout
      if (exercises && exercises.length > 0) {
        const newExercises = exercises.map((ex) => ({
          workout_plan_id: newWorkout.id,
          exercise_id: ex.exercise_id,
          sets: ex.sets,
          reps: ex.reps,
          duration_seconds: ex.duration_seconds,
          rest_seconds: ex.rest_seconds,
          order_index: ex.order_index,
          notes: ex.notes,
        }));

        const { error: insertError } = await supabase
          .from("workout_plan_exercises")
          .insert(newExercises);

        if (insertError) throw insertError;
      }

      return newWorkout;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-plans"] });
      toast({
        title: "Success",
        description: "Workout duplicated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to duplicate workout",
        variant: "destructive",
      });
      console.error("Error duplicating workout:", error);
    },
  });

  const handleDelete = (workoutId: string) => {
    setWorkoutToDelete(workoutId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (workoutToDelete) {
      deleteMutation.mutate(workoutToDelete);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading workouts...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-6 max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Workout Library</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Create and manage workout plans for your clients</p>
          </div>
          <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:justify-end">
            <Button variant="outline" className="w-full md:w-auto" onClick={() => navigate("/workout-templates")}>
              <BookTemplate className="h-4 w-4 mr-2" />
              Templates
            </Button>
            <Button variant="outline" onClick={() => setProgramBuilderOpen(true)} className="w-full md:w-auto gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="truncate">AI Program Builder</span>
            </Button>
            <Button className="col-span-2 w-full md:w-auto gap-2" onClick={() => navigate("/workouts/create")}>
              <Plus className="h-4 w-4" />
              Create New Workout
            </Button>
          </div>
        </div>


        {/* Search and Filters */}
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workout plans..."
              className="pl-9"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Workout Templates Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {workoutPlans && workoutPlans.length > 0 ? (
            workoutPlans.map((workout) => (
              <Card 
                key={workout.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden flex flex-col"
                onClick={() => navigate(`/workouts/${workout.id}`)}
              >
                {/* Cover Image */}
                <div className="relative w-full aspect-video bg-background overflow-hidden">
                  {workout.image_url ? (
                    <img
                      src={workout.image_url}
                      alt={workout.name}
                      className="absolute inset-0 h-full w-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <Dumbbell className="h-10 w-10 text-primary/40" />
                    </div>
                  )}
                </div>

                <CardContent className="p-3 space-y-2 flex-1 flex flex-col">
                  <h3 className="font-bold text-sm leading-tight line-clamp-2">{workout.name}</h3>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className="rounded-full text-[10px] capitalize">
                      {workout.category || "General"}
                    </Badge>
                    <Badge className={`rounded-full text-[10px] border-0 capitalize ${difficultyColors[workout.difficulty as keyof typeof difficultyColors] || "bg-muted text-muted-foreground"}`}>
                      {workout.difficulty}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{getDisplayedDuration(workout.name, workout.duration_minutes)} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      <span>{workout.workout_plan_exercises?.[0]?.count || 0}</span>
                    </div>
                  </div>

                  <div className="mt-auto pt-1 space-y-2">
                    <Button
                      size="sm"
                      className="w-full rounded-full text-xs font-bold uppercase tracking-wider"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/workouts/${workout.id}`);
                      }}
                    >
                      Preview
                    </Button>
                    <div className="flex gap-1.5">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 px-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/workouts/edit/${workout.id}`);
                        }}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 px-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setWorkoutToTemplate({ id: workout.id, name: workout.name });
                          setTemplateDialogOpen(true);
                        }}
                        title="Save as Template"
                      >
                        <BookTemplate className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 px-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateMutation.mutate(workout.id);
                        }}
                        disabled={duplicateMutation.isPending}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="flex-1 px-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(workout.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No workout plans yet. Create your first one!</p>
            </div>
          )}
        </div>

        {/* Create Workout CTA */}
        <Card className="border-dashed border-2 bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Create Your First Custom Workout</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              Build personalized workout plans with our easy-to-use builder. Add exercises, set reps, and customize for each client.
            </p>
            <Button size="lg" onClick={() => navigate("/workouts/create")}>
              <Plus className="h-4 w-4 mr-2" />
              Start Building
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this workout? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* Save as Template Dialog */}
      {workoutToTemplate && (
        <SaveAsTemplateDialog
          open={templateDialogOpen}
          onOpenChange={setTemplateDialogOpen}
          workoutId={workoutToTemplate.id}
          workoutName={workoutToTemplate.name}
        />
      )}

      <AIProgramBuilderDialog
        open={programBuilderOpen}
        onOpenChange={setProgramBuilderOpen}
        onProgramCreated={() => queryClient.invalidateQueries({ queryKey: ["workout-plans"] })}
      />
    </DashboardLayout>
  );
}
