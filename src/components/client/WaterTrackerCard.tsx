import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoreHorizontal, Plus, Droplet, Star, Trophy, Undo2, Settings2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Daily Water Tracker — inspired by minimalist hydration trackers.
 * Shows a horizontal progress bar with a sliding glass icon, milestone star,
 * dynamic motivational copy, and a 100% celebration overlay.
 */

const MOTIVATIONAL = [
  {
    threshold: 0,
    title: "Drink eight — feel great!",
    body: "Starting the day with a glass of water is always a good idea.",
  },
  {
    threshold: 0.25,
    title: "Keep your body hydrated!",
    body: "Sometimes our body confuses hunger with thirst. Have a glass and check.",
  },
  {
    threshold: 0.5,
    title: "Halfway there — nice work!",
    body: "Plain water never breaks your fast — drink as much as you want.",
  },
  {
    threshold: 0.75,
    title: "You're doing great! Keep it up!",
    body: "Almost there. One more refill and you've nailed today's goal.",
  },
  {
    threshold: 1,
    title: "You did it! Your body says thank you!",
    body: "Goal achieved — every cell in your body just got a little happier.",
  },
];

function getMessage(progress: number) {
  let match = MOTIVATIONAL[0];
  for (const m of MOTIVATIONAL) {
    if (progress >= m.threshold) match = m;
  }
  return match;
}

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function WaterTrackerCard() {
  const clientId = useEffectiveClientId();
  const queryClient = useQueryClient();
  const [celebrate, setCelebrate] = useState(false);
  const [hasCelebrated, setHasCelebrated] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [goalInput, setGoalInput] = useState("64");
  const [servingInput, setServingInput] = useState("8");

  // Goal settings
  const { data: settings } = useQuery({
    queryKey: ["water-goal-settings", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data } = await supabase
        .from("water_goal_settings")
        .select("daily_goal_oz, serving_size_oz")
        .eq("client_id", clientId)
        .maybeSingle();
      return data ?? { daily_goal_oz: 64, serving_size_oz: 8 };
    },
    enabled: !!clientId,
  });

  // Today's entries
  const { data: entries = [] } = useQuery({
    queryKey: ["water-log-today", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data } = await supabase
        .from("water_log_entries")
        .select("id, amount_oz, logged_at")
        .eq("client_id", clientId)
        .gte("logged_at", startOfTodayISO())
        .order("logged_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!clientId,
  });

  const goalOz = Number(settings?.daily_goal_oz ?? 64);
  const servingOz = Number(settings?.serving_size_oz ?? 8);
  const totalOz = entries.reduce((sum, e) => sum + Number(e.amount_oz), 0);
  const progress = goalOz > 0 ? Math.min(totalOz / goalOz, 1) : 0;
  const percent = Math.round(progress * 100);
  const message = useMemo(() => getMessage(progress), [progress]);
  const lastEntry = entries[0];

  useEffect(() => {
    setGoalInput(String(goalOz));
    setServingInput(String(servingOz));
  }, [goalOz, servingOz]);

  // Trigger celebration only once per crossing
  useEffect(() => {
    if (progress >= 1 && !hasCelebrated) {
      setCelebrate(true);
      setHasCelebrated(true);
      const t = setTimeout(() => setCelebrate(false), 2400);
      return () => clearTimeout(t);
    }
    if (progress < 1 && hasCelebrated) {
      setHasCelebrated(false);
    }
  }, [progress, hasCelebrated]);

  const handleAdd = async (amount = servingOz) => {
    if (!clientId) return;
    const { error } = await supabase.from("water_log_entries").insert({
      client_id: clientId,
      amount_oz: amount,
    });
    if (error) {
      toast.error("Couldn't log water");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["water-log-today", clientId] });
  };

  const handleUndo = async () => {
    if (!lastEntry) return;
    const { error } = await supabase
      .from("water_log_entries")
      .delete()
      .eq("id", lastEntry.id);
    if (error) {
      toast.error("Couldn't undo");
      return;
    }
    toast.success("Removed last entry");
    queryClient.invalidateQueries({ queryKey: ["water-log-today", clientId] });
  };

  const handleSaveSettings = async () => {
    if (!clientId) return;
    const goal = Number(goalInput);
    const serving = Number(servingInput);
    if (!goal || goal <= 0 || !serving || serving <= 0) {
      toast.error("Enter valid numbers");
      return;
    }
    const { error } = await supabase
      .from("water_goal_settings")
      .upsert(
        { client_id: clientId, daily_goal_oz: goal, serving_size_oz: serving },
        { onConflict: "client_id" },
      );
    if (error) {
      toast.error("Couldn't save");
      return;
    }
    toast.success("Goal updated");
    setSettingsOpen(false);
    queryClient.invalidateQueries({ queryKey: ["water-goal-settings", clientId] });
  };

  // Layout: 8 droplet markers spaced across the bar (last replaced by star)
  const markers = Array.from({ length: 8 }, (_, i) => i);

  return (
    <Card className="relative overflow-hidden border-border/60 bg-card">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Daily Water Goal</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Water tracker options"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                <Settings2 className="h-4 w-4 mr-2" /> Adjust goal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAdd(servingOz / 2)}>
                <Droplet className="h-4 w-4 mr-2" /> Add half ({servingOz / 2} fl oz)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleUndo}
                disabled={!lastEntry}
                className="text-destructive focus:text-destructive"
              >
                <Undo2 className="h-4 w-4 mr-2" /> Undo last
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Numeric readout */}
        <div className="text-2xl font-bold text-foreground">
          {totalOz} fl oz
          <span className="text-muted-foreground font-medium">/{goalOz} fl oz</span>
        </div>

        {/* Progress bar with sliding glass */}
        <div className="relative h-14">
          {/* Track */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 rounded-full bg-secondary/60 overflow-hidden">
            {/* Droplet markers — sit BEHIND the fill so the % label stays visible on top */}
            <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none z-0">
              {markers.map((i) => {
                const isLast = i === markers.length - 1;
                if (isLast) {
                  return (
                    <Star
                      key={i}
                      className="h-5 w-5 text-amber-400 fill-amber-400/80"
                    />
                  );
                }
                return (
                  <Droplet
                    key={i}
                    className="h-4 w-4 text-sky-300/60 fill-sky-300/40"
                  />
                );
              })}
            </div>

            {/* Fill */}
            <div
              className="relative h-full rounded-full bg-gradient-to-r from-sky-500/85 to-sky-400/90 transition-all duration-700 ease-out flex items-center px-3 z-10"
              style={{ width: `${Math.max(percent, 6)}%` }}
            >
              {percent > 0 && (
                <span className="text-xs font-semibold text-white drop-shadow">
                  {percent}%
                </span>
              )}
            </div>
          </div>

          {/* Sliding glass */}
          <button
            type="button"
            onClick={() => handleAdd()}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-700 ease-out group"
            style={{ left: `${Math.max(percent, 4)}%` }}
            aria-label={`Add ${servingOz} fl oz of water`}
          >
            <div className="relative">
              {/* Glass icon */}
              <svg width="44" height="52" viewBox="0 0 44 52" className="drop-shadow-lg">
                <defs>
                  <linearGradient id="waterGlass" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(200 90% 75% / 0.9)" />
                    <stop offset="100%" stopColor="hsl(210 85% 55% / 0.95)" />
                  </linearGradient>
                </defs>
                <path
                  d="M8 6 L36 6 L33 46 Q33 50 28 50 L16 50 Q11 50 11 46 Z"
                  fill="hsl(0 0% 100% / 0.18)"
                  stroke="hsl(200 80% 80% / 0.7)"
                  strokeWidth="1.5"
                />
                {/* Water inside glass scales with progress */}
                <path
                  d={`M9 ${48 - 38 * Math.min(progress + 0.15, 1)} L35 ${48 - 38 * Math.min(progress + 0.15, 1)} L33 46 Q33 50 28 50 L16 50 Q11 50 11 46 Z`}
                  fill="url(#waterGlass)"
                />
              </svg>
              {/* Plus button overlay */}
              <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-emerald-500 group-hover:bg-emerald-400 group-active:scale-95 flex items-center justify-center shadow-lg ring-2 ring-card transition-all">
                <Plus className="h-4 w-4 text-white" strokeWidth={3} />
              </div>
            </div>
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-border/60" />

        {/* Motivational message */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-foreground">{message.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{message.body}</p>
          </div>
          {progress >= 1 ? (
            <Trophy className="h-10 w-10 text-amber-400 shrink-0" />
          ) : (
            <Droplet className="h-9 w-9 text-sky-400 shrink-0" />
          )}
        </div>

        {/* Quick stats */}
        {entries.length > 0 && (
          <div className="text-xs text-muted-foreground">
            {entries.length} {entries.length === 1 ? "log" : "logs"} today · tap the glass to add {servingOz} fl oz
          </div>
        )}
      </CardContent>

      {/* Celebration overlay */}
      {celebrate && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-sky-500/30 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-500 pointer-events-none">
          <div className="text-5xl font-extrabold text-white drop-shadow-lg">100%</div>
          <div className="text-xl font-bold text-white drop-shadow mt-1">Goal achieved!</div>
        </div>
      )}

      {/* Settings dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust water goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="daily-goal">Daily goal (fl oz)</Label>
              <Input
                id="daily-goal"
                type="number"
                inputMode="numeric"
                min={1}
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serving-size">Serving size per tap (fl oz)</Label>
              <Input
                id="serving-size"
                type="number"
                inputMode="numeric"
                min={1}
                value={servingInput}
                onChange={(e) => setServingInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSettingsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default WaterTrackerCard;