import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
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
import { MoreHorizontal, Plus, Droplet, Star, Trophy, Undo2, Settings2, X, GlassWater, Check } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useHabitLoopPreferences } from "@/hooks/useHabitLoopPreferences";
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

// Unit conversion helpers
const OZ_PER_LITER = 33.814;
const ozToLiter = (oz: number) => oz / OZ_PER_LITER;
const literToOz = (l: number) => l * OZ_PER_LITER;

type Unit = "fl_oz" | "liter";
type Portion = "glass" | "bottle";
const PORTION_OZ: Record<Portion, number> = { glass: 8, bottle: 16 };

function formatVolume(oz: number, unit: Unit) {
  if (unit === "liter") return `${ozToLiter(oz).toFixed(2)} L`;
  return `${Math.round(oz)} fl oz`;
}

export function WaterTrackerCard() {
  const clientId = useEffectiveClientId();
  const queryClient = useQueryClient();
  const [celebrate, setCelebrate] = useState(false);
  const [hasCelebrated, setHasCelebrated] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Draft state for the Settings dialog
  const [draftUnit, setDraftUnit] = useState<Unit>("fl_oz");
  const [draftPortion, setDraftPortion] = useState<Portion>("glass");
  const [draftGoalOz, setDraftGoalOz] = useState<number>(64);
  const [draftReminders, setDraftReminders] = useState<boolean>(true);

  const { prefs: habitPrefs, updatePrefs: updateHabitPrefs } = useHabitLoopPreferences();

  // Goal settings
  const { data: settings } = useQuery({
    queryKey: ["water-goal-settings", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data } = await supabase
        .from("water_goal_settings")
        .select("daily_goal_oz, serving_size_oz, unit, reminders_enabled")
        .eq("client_id", clientId)
        .maybeSingle();
      return data ?? { daily_goal_oz: 64, serving_size_oz: 8, unit: "fl_oz", reminders_enabled: true };
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
  const unit: Unit = (settings?.unit as Unit) ?? "fl_oz";
  const remindersEnabled = settings?.reminders_enabled ?? true;
  const totalOz = entries.reduce((sum, e) => sum + Number(e.amount_oz), 0);
  const progress = goalOz > 0 ? Math.min(totalOz / goalOz, 1) : 0;
  const percent = Math.round(progress * 100);
  const message = useMemo(() => getMessage(progress), [progress]);
  const lastEntry = entries[0];

  // Sync draft state with saved settings whenever the dialog opens
  useEffect(() => {
    if (settingsOpen) {
      setDraftUnit(unit);
      setDraftPortion(servingOz >= 12 ? "bottle" : "glass");
      setDraftGoalOz(goalOz);
      setDraftReminders(remindersEnabled);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsOpen]);

  // Trigger celebration only once per crossing
  useEffect(() => {
    if (progress >= 1 && !hasCelebrated) {
      setCelebrate(true);
      setHasCelebrated(true);
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
    const goal = Math.round(draftGoalOz);
    const serving = PORTION_OZ[draftPortion];
    if (!goal || goal <= 0) {
      toast.error("Enter a valid goal");
      return;
    }
    const { error } = await supabase
      .from("water_goal_settings")
      .upsert(
        {
          client_id: clientId,
          daily_goal_oz: goal,
          serving_size_oz: serving,
          unit: draftUnit,
          reminders_enabled: draftReminders,
        },
        { onConflict: "client_id" },
      );
    if (error) {
      toast.error("Couldn't save");
      return;
    }

    // Wire the Reminders switch into the Habit Loop preferences
    if (habitPrefs && habitPrefs.hydration_enabled !== draftReminders) {
      try {
        updateHabitPrefs({ hydration_enabled: draftReminders } as any);
      } catch {
        /* non-fatal */
      }
    }

    toast.success("Water tracker updated");
    setSettingsOpen(false);
    queryClient.invalidateQueries({ queryKey: ["water-goal-settings", clientId] });
  };

  // Slider configuration adapts to the chosen unit
  const sliderMinOz = draftUnit === "liter" ? Math.round(literToOz(0.5)) : 16;
  const sliderMaxOz = draftUnit === "liter" ? Math.round(literToOz(5)) : 200;
  const sliderStepOz = draftUnit === "liter" ? Math.round(literToOz(0.1)) : 8;
  const draftGoalDisplay =
    draftUnit === "liter"
      ? `${ozToLiter(draftGoalOz).toFixed(2)} L`
      : `${Math.round(draftGoalOz)} fl oz`;
  const portionDisplay = (oz: number) =>
    draftUnit === "liter" ? `${ozToLiter(oz).toFixed(2)} L` : `${oz} fl oz`;
  const bottleCount = Math.round(draftGoalOz / PORTION_OZ[draftPortion]);

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
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="text-2xl font-bold text-foreground hover:opacity-80 transition-opacity text-left"
          aria-label="Open water tracker settings"
        >
          {formatVolume(totalOz, unit)}
          <span className="text-muted-foreground font-medium">
            /{formatVolume(goalOz, unit)}
          </span>
        </button>

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

      {/* Animated celebration overlay */}
      {celebrate && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden rounded-[inherit] animate-in fade-in duration-300">
          {/* Layered background: deep blue gradient + subtle blur of card behind */}
          <div className="absolute inset-0 bg-gradient-to-br from-sky-600/85 via-sky-500/85 to-cyan-500/85 backdrop-blur-md" />

          {/* Rising bubbles */}
          {Array.from({ length: 14 }).map((_, i) => {
            const left = (i * 7 + (i % 3) * 11) % 95;
            const size = 8 + ((i * 5) % 18);
            const delay = (i * 0.18) % 2.4;
            const duration = 2.6 + ((i * 0.3) % 1.8);
            return (
              <span
                key={`bubble-${i}`}
                className="absolute rounded-full bg-white/40 ring-1 ring-white/60 wt-bubble"
                style={{
                  left: `${left}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  bottom: `-20px`,
                  animationDelay: `${delay}s`,
                  animationDuration: `${duration}s`,
                }}
              />
            );
          })}

          {/* Confetti shards */}
          {Array.from({ length: 18 }).map((_, i) => {
            const left = (i * 13 + 5) % 100;
            const delay = (i * 0.07) % 0.9;
            const duration = 1.6 + ((i * 0.25) % 1.4);
            const colors = ["bg-amber-300", "bg-pink-300", "bg-emerald-300", "bg-white", "bg-yellow-200"];
            const color = colors[i % colors.length];
            const rotate = (i * 47) % 360;
            return (
              <span
                key={`confetti-${i}`}
                className={cn("absolute w-2 h-3 rounded-sm wt-confetti", color)}
                style={{
                  left: `${left}%`,
                  top: `-12px`,
                  animationDelay: `${delay}s`,
                  animationDuration: `${duration}s`,
                  transform: `rotate(${rotate}deg)`,
                }}
              />
            );
          })}

          {/* Pulsing rings behind trophy */}
          <div className="absolute h-32 w-32 rounded-full bg-white/20 wt-ripple" />
          <div
            className="absolute h-32 w-32 rounded-full bg-white/15 wt-ripple"
            style={{ animationDelay: "0.6s" }}
          />

          {/* Bouncing trophy */}
          <div className="relative z-10 wt-trophy">
            <div className="absolute inset-0 -m-4 rounded-full bg-amber-300/40 blur-2xl" />
            <Trophy
              className="relative h-16 w-16 text-amber-300 fill-amber-400/90 drop-shadow-[0_4px_12px_rgba(251,191,36,0.6)]"
              strokeWidth={1.5}
            />
          </div>

          {/* Text */}
          <div className="relative z-10 mt-3 text-center wt-pop">
            <div className="text-6xl font-extrabold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)] tracking-tight">
              100%
            </div>
            <div className="text-xl font-bold text-white drop-shadow mt-0.5">
              Goal achieved!
            </div>
            <div className="text-sm text-white/85 mt-1 px-6">
              Your body says thank you 💧
            </div>
          </div>

          {/* Close X */}
          <button
            type="button"
            onClick={() => setCelebrate(false)}
            className="absolute top-3 right-3 z-20 h-9 w-9 rounded-full bg-white/20 hover:bg-white/35 active:scale-95 backdrop-blur flex items-center justify-center transition-all ring-1 ring-white/40"
            aria-label="Dismiss celebration"
          >
            <X className="h-5 w-5 text-white" strokeWidth={2.5} />
          </button>

          {/* Scoped keyframes */}
          <style>{`
            @keyframes wt-bubble-rise {
              0% { transform: translateY(0) scale(0.6); opacity: 0; }
              15% { opacity: 1; }
              100% { transform: translateY(-380px) scale(1); opacity: 0; }
            }
            .wt-bubble {
              animation-name: wt-bubble-rise;
              animation-iteration-count: infinite;
              animation-timing-function: ease-in;
            }
            @keyframes wt-confetti-fall {
              0% { transform: translateY(0) rotate(0deg); opacity: 0; }
              10% { opacity: 1; }
              100% { transform: translateY(420px) rotate(540deg); opacity: 0; }
            }
            .wt-confetti {
              animation-name: wt-confetti-fall;
              animation-iteration-count: infinite;
              animation-timing-function: linear;
            }
            @keyframes wt-ripple {
              0% { transform: scale(0.6); opacity: 0.7; }
              100% { transform: scale(2.4); opacity: 0; }
            }
            .wt-ripple {
              animation: wt-ripple 1.8s ease-out infinite;
            }
            @keyframes wt-trophy-bounce {
              0%, 100% { transform: translateY(0) rotate(-4deg); }
              25% { transform: translateY(-14px) rotate(6deg); }
              50% { transform: translateY(0) rotate(-3deg); }
              75% { transform: translateY(-6px) rotate(4deg); }
            }
            .wt-trophy {
              animation: wt-trophy-bounce 1.4s ease-in-out infinite;
            }
            @keyframes wt-pop {
              0% { transform: scale(0.4); opacity: 0; }
              60% { transform: scale(1.1); opacity: 1; }
              100% { transform: scale(1); opacity: 1; }
            }
            .wt-pop {
              animation: wt-pop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both;
            }
          `}</style>
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