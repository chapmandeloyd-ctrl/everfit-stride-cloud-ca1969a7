import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dumbbell, Copy, Clock, Loader2, Search, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function AllClientWorkouts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  // Get all clients
  const { data: clients = [] } = useQuery({
    queryKey: ["trainer-clients-list", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_clients")
        .select("client_id, client:profiles!trainer_clients_client_id_fkey(id, full_name, email, avatar_url)")
        .eq("trainer_id", user?.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Get all client-built workout plans (where trainer_id matches a client's id)
  const clientIds = clients.map((c: any) => c.client_id);
  const { data: allWods = [], isLoading } = useQuery({
    queryKey: ["all-client-wods", clientIds],
    queryFn: async () => {
      if (clientIds.length === 0) return [];
      const { data, error } = await supabase
        .from("workout_plans")
        .select(`
          id, name, category, difficulty, duration_minutes, created_at, trainer_id,
          workout_sections(
            id,
            workout_plan_exercises(id)
          )
        `)
        .in("trainer_id", clientIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: clientIds.length > 0,
  });

  const copyToLibrary = useMutation({
    mutationFn: async (wodId: string) => {
      // Fetch full workout
      const { data: wod, error } = await supabase
        .from("workout_plans")
        .select(`
          *, workout_sections(
            *, workout_plan_exercises(*)
          )
        `)
        .eq("id", wodId)
        .single();
      if (error) throw error;

      const { data: newPlan, error: planError } = await supabase
        .from("workout_plans")
        .insert({
          name: `${wod.name} (from client)`,
          category: wod.category,
          difficulty: wod.difficulty,
          duration_minutes: wod.duration_minutes,
          trainer_id: user!.id,
        })
        .select()
        .single();
      if (planError) throw planError;

      for (const section of (wod.workout_sections || [])) {
        const { data: newSection, error: secError } = await supabase
          .from("workout_sections")
          .insert({
            workout_plan_id: newPlan.id,
            name: section.name,
            block_type: section.block_type,
            order_index: section.order_index || 0,
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

  // Group by client
  const clientMap = new Map(clients.map((c: any) => [c.client_id, c.client]));
  const grouped = new Map<string, any[]>();
  for (const wod of allWods) {
    const existing = grouped.get(wod.trainer_id) || [];
    existing.push(wod);
    grouped.set(wod.trainer_id, existing);
  }

  const filteredClients = Array.from(grouped.entries()).filter(([cid]) => {
    if (!search) return true;
    const client = clientMap.get(cid);
    const name = (client?.full_name || client?.email || "").toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Client Workouts</h1>
          <p className="text-sm text-muted-foreground mt-1">All workouts built by your clients in their WOD Builder</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Dumbbell className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <p className="text-lg font-semibold text-foreground">No client-built workouts yet</p>
            <p className="text-sm text-muted-foreground">
              When clients create workouts in their WOD Builder, they'll appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredClients.map(([clientId, wods]) => {
              const client = clientMap.get(clientId);
              const clientName = client?.full_name || client?.email || "Client";
              return (
                <div key={clientId} className="space-y-3">
                  <button
                    onClick={() => navigate(`/clients/${clientId}`)}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={client?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {clientName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-foreground">{clientName}</span>
                    <Badge variant="secondary" className="text-[10px]">{wods.length} WOD{wods.length !== 1 ? "s" : ""}</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <div className="space-y-2 ml-11">
                    {wods.map((wod) => {
                      const totalEx = (wod.workout_sections || []).reduce(
                        (s: number, sec: any) => s + (sec.workout_plan_exercises?.length || 0), 0
                      );
                      return (
                        <Card key={wod.id}>
                          <CardContent className="p-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{wod.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                {wod.duration_minutes > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> {wod.duration_minutes}m
                                  </span>
                                )}
                                <span>{totalEx} ex</span>
                                <span>{format(new Date(wod.created_at), "MMM d")}</span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0 gap-1.5"
                              onClick={() => copyToLibrary.mutate(wod.id)}
                              disabled={copyToLibrary.isPending}
                            >
                              {copyToLibrary.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                              Copy
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
