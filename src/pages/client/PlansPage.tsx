import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/hooks/useAuth";
import { CalendarStrip } from "@/components/client/CalendarStrip";
import { Dumbbell, CheckCircle2, Clock, ChefHat, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface ClientContext {
  profile: Profile;
  onSignOut: () => void;
}

export default function PlansPage() {
  const { profile } = useOutletContext<ClientContext>();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [habits, setHabits] = useState<any[]>([]);
  const [macros, setMacros] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (!profile?.id) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    // Fetch workouts for date
    supabase
      .from("client_workouts")
      .select("*, workout_plan:workout_plans(name, description)")
      .eq("client_id", profile.id)
      .eq("scheduled_date", dateStr)
      .then(({ data }) => setWorkouts(data || []));

    // Fetch tasks
    supabase
      .from("client_tasks")
      .select("*")
      .eq("client_id", profile.id)
      .is("completed_at", null)
      .then(({ data }) => setTasks(data || []));

    // Fetch habits
    supabase
      .from("client_habits")
      .select("*")
      .eq("client_id", profile.id)
      .eq("is_active", true)
      .then(({ data }) => setHabits(data || []));

    // Fetch macros
    supabase
      .from("client_macro_targets")
      .select("*")
      .eq("client_id", profile.id)
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }) => setMacros(data));
  }, [profile?.id, selectedDate]);

  return (
    <div className="px-4 pt-4 pb-6 max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading">Coaching Hub</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your training & nutrition plan</p>
      </div>

      {/* Calendar */}
      <CalendarStrip onDateSelect={setSelectedDate} />

      {/* Workouts */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-primary" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Workouts
          </p>
        </div>

        {workouts.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">No workouts scheduled</p>
          </div>
        ) : (
          workouts.map((w) => (
            <div
              key={w.id}
              className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Dumbbell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{w.workout_plan?.name || "Workout"}</p>
                  <p className="text-xs text-muted-foreground">{w.notes || "Assigned by coach"}</p>
                </div>
              </div>
              {w.completed_at ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <Badge variant="secondary" className="text-[10px]">Pending</Badge>
              )}
            </div>
          ))
        )}
      </section>

      {/* Tasks */}
      {tasks.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-accent" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tasks
            </p>
          </div>
          {tasks.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3"
            >
              <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/40 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{t.name}</p>
                {t.due_date && (
                  <p className="text-xs text-muted-foreground">
                    Due {format(new Date(t.due_date), "MMM d")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Habits */}
      {habits.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Daily Habits
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {habits.map((h) => (
              <div
                key={h.id}
                className="rounded-2xl border border-border bg-card p-3 space-y-1"
              >
                <p className="text-sm font-semibold truncate">{h.name}</p>
                <p className="text-xs text-muted-foreground">
                  {h.goal_value} {h.goal_unit}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Macros Card */}
      {macros && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ChefHat className="h-4 w-4 text-accent" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Macros Target
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="grid grid-cols-4 gap-3 text-center">
              <MacroStat label="Calories" value={macros.target_calories} />
              <MacroStat label="Protein" value={macros.target_protein} unit="g" />
              <MacroStat label="Carbs" value={macros.target_carbs} unit="g" />
              <MacroStat label="Fats" value={macros.target_fats} unit="g" />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function MacroStat({ label, value, unit }: { label: string; value?: number | null; unit?: string }) {
  return (
    <div>
      <p className="text-lg font-bold font-heading">{value ?? "—"}</p>
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}{unit ? ` (${unit})` : ""}
      </p>
    </div>
  );
}
