import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Minus, Droplet, Star, Trophy, Settings, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useHabitLoopPreferences } from "@/hooks/useHabitLoopPreferences";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { WaterTrackerSettingsDialog } from "@/components/water/WaterTrackerSettingsDialog";

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

type Unit = "fl_oz" | "liter";

function formatVolume(oz: number, unit: Unit) {
  if (unit === "liter") return `${ozToLiter(oz).toFixed(2)} L`;
  return `${Math.round(oz)} fl oz`;
}

export function WaterTrackerCard() {
  const clientId = useEffectiveClientId();
  const queryClient = useQueryClient();
  const todayKey = new Date().toISOString().slice(0, 10);
  const celebrationStorageKey = `water-celebrated:${clientId ?? "anon"}:${todayKey}`;
  const [celebrate, setCelebrate] = useState(false);
  const [hasCelebrated, setHasCelebrated] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(celebrationStorageKey) === "1";
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const previousProgressRef = useRef(0);

  const { prefs: habitPrefs, updatePrefs: updateHabitPrefs } = useHabitLoopPreferences();

  // Goal settings
  const { data: settings, isPending: settingsPending } = useQuery({
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
  const { data: entries = [], isPending: entriesPending } = useQuery({
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

  const isHydrationLoading = !!clientId && (settingsPending || entriesPending);
  const goalOz = isHydrationLoading ? 0 : Number(settings?.daily_goal_oz ?? 64);
  const servingOz = isHydrationLoading ? 8 : Number(settings?.serving_size_oz ?? 8);
  const unit: Unit = isHydrationLoading ? "fl_oz" : ((settings?.unit as Unit) ?? "fl_oz");
  const portionType = servingOz >= 12 ? "bottle" : "glass";
  const totalOz = isHydrationLoading ? 0 : entries.reduce((sum, e) => sum + Number(e.amount_oz), 0);
  const cappedTotalOz = goalOz > 0 ? Math.min(totalOz, goalOz) : totalOz;
  const remainingOz = Math.max(goalOz - cappedTotalOz, 0);
  const tapAmountOz = Math.min(servingOz, remainingOz || servingOz);
  const progress = goalOz > 0 ? Math.min(cappedTotalOz / goalOz, 1) : 0;
  const percent = Math.round(progress * 100);
  const message = useMemo(() => getMessage(progress), [progress]);
  const lastEntry = entries[0];

  // Hard cap: don't allow logging past the goal
  const atGoal = goalOz > 0 && totalOz >= goalOz;
  const canRemove = entries.length > 0;
  const [pulse, setPulse] = useState<"add" | "remove" | null>(null);
  const triggerPulse = (kind: "add" | "remove") => {
    setPulse(kind);
    window.setTimeout(() => setPulse(null), 350);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(celebrationStorageKey) === "1";
    setHasCelebrated(stored);
    setCelebrate(false);
    previousProgressRef.current = progress;
  }, [celebrationStorageKey]);

  // Trigger celebration only when crossing into goal for the first time that day
  useEffect(() => {
    const crossedIntoGoal = previousProgressRef.current < 1 && progress >= 1;

    if (crossedIntoGoal && !hasCelebrated) {
      setCelebrate(true);
      setHasCelebrated(true);
      try {
        window.localStorage.setItem(celebrationStorageKey, "1");
      } catch {
        /* noop */
      }
    }

    previousProgressRef.current = progress;
  }, [progress, hasCelebrated, celebrationStorageKey]);

  useEffect(() => {
    if (!clientId || !overflowRepairPlan || repairingOverflow) return;
    if (lastRepairSignatureRef.current === overflowRepairPlan.signature) return;

    lastRepairSignatureRef.current = overflowRepairPlan.signature;

    console.warn("[💧water] 🔧 overflow repair plan executing — entries will be trimmed/deleted:", overflowRepairPlan);

    const repairOverflow = async () => {
      setRepairingOverflow(true);

      try {
        if (overflowRepairPlan.updateEntry && overflowRepairPlan.updateEntry.amountOz > 0) {
          const { error: updateError } = await supabase
            .from("water_log_entries")
            .update({ amount_oz: overflowRepairPlan.updateEntry.amountOz })
            .eq("id", overflowRepairPlan.updateEntry.id);

          if (updateError) throw updateError;
        }

        if (overflowRepairPlan.deleteIds.length > 0) {
          const { error: deleteError } = await supabase
            .from("water_log_entries")
            .delete()
            .in("id", overflowRepairPlan.deleteIds);

          if (deleteError) throw deleteError;
        }

        queryClient.invalidateQueries({ queryKey: ["water-log-today", clientId] });
        queryClient.invalidateQueries({ queryKey: ["daily-rings", clientId] });
      } catch {
        lastRepairSignatureRef.current = null;
        toast.error("Couldn't repair today's water total");
      } finally {
        setRepairingOverflow(false);
      }
    };

    void repairOverflow();
  }, [clientId, overflowRepairPlan, queryClient, repairingOverflow]);

  const handleAdd = async (amount = servingOz) => {
    if (!clientId) return;
    if (repairingOverflow) return;
    if (atGoal || remainingOz <= 0) {
      toast("Goal already reached for today 🎉");
      return;
    }

    const amountToInsert = Math.min(amount, remainingOz);
    if (amountToInsert <= 0) return;

    triggerPulse("add");
    const { error } = await supabase.from("water_log_entries").insert({
      client_id: clientId,
      amount_oz: amountToInsert,
    });
    if (error) {
      toast.error("Couldn't log water");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["water-log-today", clientId] });
    queryClient.invalidateQueries({ queryKey: ["daily-rings", clientId] });
  };

  const handleUndo = async () => {
    if (!lastEntry || repairingOverflow) return;
    triggerPulse("remove");
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
    queryClient.invalidateQueries({ queryKey: ["daily-rings", clientId] });
  };

  // Layout: 8 droplet markers spaced across the bar (last replaced by star)
  const markers = Array.from({ length: 8 }, (_, i) => i);

  if (isHydrationLoading) {
    return (
      <Card className="relative overflow-hidden border-border/60 bg-card">
        <CardContent className="p-5 space-y-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 rounded bg-secondary/70" />
            <div className="h-9 w-9 rounded-full bg-secondary/70" />
          </div>
          <div className="h-8 w-36 rounded bg-secondary/70" />
          <div className="h-14 rounded-3xl bg-secondary/60" />
          <div className="flex items-center justify-center gap-4 pt-1">
            <div className="h-14 w-14 rounded-full bg-secondary/70" />
            <div className="h-6 w-28 rounded bg-secondary/70" />
            <div className="h-14 w-14 rounded-full bg-secondary/70" />
          </div>
          <div className="border-t border-border/60 pt-4 space-y-2">
            <div className="h-5 w-40 rounded bg-secondary/70" />
            <div className="h-4 w-56 rounded bg-secondary/60" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-border/60 bg-card">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Daily Water Goal</span>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 active:scale-95 transition-all"
            aria-label="Open water tracker settings"
          >
            <Settings className="h-[22px] w-[22px]" strokeWidth={1.75} />
          </button>
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

          {/* Sliding glass — purely visual, smooth */}
          <div
            className="absolute top-1/2 pointer-events-none select-none"
            style={{
              left: `${Math.max(percent, 4)}%`,
              transform: "translate(-50%, -50%)",
              transition: "left 700ms ease-out",
            }}
            aria-hidden="true"
          >
            <div
              className={cn(
                "relative transition-transform duration-300",
                pulse === "add" && "scale-110",
                pulse === "remove" && "scale-90"
              )}
            >
              <svg width="44" height="52" viewBox="0 0 44 52" className="drop-shadow-lg">
                <defs>
                  <linearGradient id="waterPortion" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(200 90% 75% / 0.9)" />
                    <stop offset="100%" stopColor="hsl(210 85% 55% / 0.95)" />
                  </linearGradient>
                </defs>

                {portionType === "bottle" ? (
                  (() => {
                    // Bottle interior: y=14 (top) to y=46 (bottom) ≈ 32px tall
                    const top = 14;
                    const bottom = 46;
                    const fillY = bottom - (bottom - top) * progress;
                    return (
                      <>
                        <rect
                          x="17"
                          y="3"
                          width="10"
                          height="4"
                          rx="1.2"
                          fill="hsl(0 0% 100% / 0.18)"
                          stroke="hsl(200 80% 80% / 0.7)"
                          strokeWidth="1.5"
                        />
                        <path
                          d="M18 7 V12 M26 7 V12"
                          stroke="hsl(200 80% 80% / 0.7)"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                        <path
                          d="M18 12 Q11 15 11 22 V43 Q11 48 16 48 H28 Q33 48 33 43 V22 Q33 15 26 12 Z"
                          fill="hsl(0 0% 100% / 0.18)"
                          stroke="hsl(200 80% 80% / 0.7)"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {progress > 0 && (
                          <path
                            d={`M12 ${fillY} Q12 ${Math.min(fillY + 2, bottom)} 13 ${fillY} Q14 ${Math.max(fillY - 1.5, top)} 16 ${fillY} Q18 ${Math.min(fillY + 1.5, bottom)} 20 ${fillY} Q22 ${Math.max(fillY - 1.5, top)} 24 ${fillY} Q26 ${Math.min(fillY + 1.5, bottom)} 28 ${fillY} Q30 ${Math.max(fillY - 1.5, top)} 32 ${fillY} V43 Q32 46.8 28 46.8 H16 Q12 46.8 12 43 Z`}
                            fill="url(#waterPortion)"
                            style={{ transition: "d 700ms ease-out" }}
                          />
                        )}
                      </>
                    );
                  })()
                ) : (
                  (() => {
                    // Glass interior: y=7 (top) to y=48 (bottom) ≈ 41px tall
                    const top = 7;
                    const bottom = 48;
                    const fillY = bottom - (bottom - top) * progress;
                    // Glass tapers: top width 28 (x 8-36), bottom width 22 (x 11-33)
                    // Linear interpolation of left/right edges based on fillY
                    const t = (bottom - fillY) / (bottom - top); // 0 at bottom, 1 at top
                    const leftX = 11 - 3 * t;
                    const rightX = 33 + 3 * t;
                    return (
                      <>
                        <path
                          d="M8 6 L36 6 L33 46 Q33 50 28 50 L16 50 Q11 50 11 46 Z"
                          fill="hsl(0 0% 100% / 0.18)"
                          stroke="hsl(200 80% 80% / 0.7)"
                          strokeWidth="1.5"
                        />
                        {progress > 0 && (
                          <path
                            d={`M${leftX} ${fillY} L${rightX} ${fillY} L33 46 Q33 50 28 50 L16 50 Q11 50 11 46 Z`}
                            fill="url(#waterPortion)"
                            style={{ transition: "d 700ms ease-out" }}
                          />
                        )}
                      </>
                    );
                  })()
                )}
              </svg>
            </div>
          </div>
        </div>

        {/* Explicit +/- controls — no gesture guessing */}
        <div className="flex items-center justify-center gap-4 pt-1">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canRemove}
            className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center shadow-md ring-1 transition-all active:scale-90",
              canRemove
                ? "bg-secondary hover:bg-secondary/80 ring-border text-foreground"
                : "bg-muted/40 ring-transparent text-muted-foreground/40 cursor-not-allowed"
            )}
            aria-label="Remove one serving"
          >
            <Minus className="h-6 w-6" strokeWidth={3} />
          </button>

          <div className="text-xs text-muted-foreground tabular-nums min-w-[80px] text-center">
            {repairingOverflow ? (
              <span className="font-semibold text-muted-foreground">Syncing…</span>
            ) : atGoal ? (
              <span className="font-semibold text-emerald-500">Goal reached</span>
            ) : (
              <>+{Math.round(tapAmountOz)} fl oz / tap</>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleAdd()}
            disabled={atGoal || repairingOverflow}
            className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center shadow-md ring-2 transition-all active:scale-90",
              atGoal || repairingOverflow
                ? "bg-muted/40 ring-transparent text-muted-foreground/40 cursor-not-allowed"
                : "bg-emerald-500 hover:bg-emerald-400 ring-card text-white"
            )}
            aria-label={`Add ${Math.round(tapAmountOz)} fl oz of water`}
          >
            <Plus className="h-6 w-6" strokeWidth={3} />
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
            {entries.length} {entries.length === 1 ? "log" : "logs"} today
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
      <WaterTrackerSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        clientId={clientId}
        currentRemindersEnabled={habitPrefs?.hydration_enabled ?? true}
        onRemindersChange={(enabled) => {
          try {
            updateHabitPrefs({ hydration_enabled: enabled } as any);
          } catch {
            /* non-fatal */
          }
        }}
        context="client"
      />
    </Card>
  );
}

export default WaterTrackerCard;