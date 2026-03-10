import { useState, useCallback } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Check, Flame, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DRILL_TYPES = ["free-throw", "mid-range", "three-point", "layup", "mixed"] as const;

export default function ClientShootingSession() {
  const navigate = useNavigate();
  const clientId = useEffectiveClientId();
  const queryClient = useQueryClient();

  const [makes, setMakes] = useState(0);
  const [misses, setMisses] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [fatigue, setFatigue] = useState(0);
  const [confidenceBefore, setConfidenceBefore] = useState(0);
  const [confidenceAfter, setConfidenceAfter] = useState(0);
  const [focus, setFocus] = useState(0);
  const [drillType, setDrillType] = useState<string>("mixed");
  const [pressureMode, setPressureMode] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [startTime] = useState(new Date().toISOString());

  const attempts = makes + misses;
  const accuracy = attempts > 0 ? Math.round((makes / attempts) * 100) : 0;

  // Pressure Pass: must hit 8/10 in last 10 shots
  const [shotLog, setShotLog] = useState<boolean[]>([]);
  const lastTen = shotLog.slice(-10);
  const lastTenMakes = lastTen.filter(Boolean).length;
  const pressurePass = pressureMode && lastTen.length === 10 && lastTenMakes >= 8;

  const logShot = useCallback((made: boolean) => {
    setShotLog((prev) => [...prev, made]);
    if (made) {
      setMakes((p) => p + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
    } else {
      setMisses((p) => p + 1);
      setStreak(0);
    }
  }, [streak, bestStreak]);

  const undoLast = () => {
    if (shotLog.length === 0) return;
    const last = shotLog[shotLog.length - 1];
    setShotLog((prev) => prev.slice(0, -1));
    if (last) {
      setMakes((p) => Math.max(0, p - 1));
    } else {
      setMisses((p) => Math.max(0, p - 1));
    }
    // Recalculate streak from log
    const remaining = shotLog.slice(0, -1);
    let s = 0;
    for (let i = remaining.length - 1; i >= 0; i--) {
      if (remaining[i]) s++;
      else break;
    }
    setStreak(s);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("shooting_sessions").insert({
        client_id: clientId!,
        drill_type: drillType,
        attempts,
        makes,
        best_streak: bestStreak,
        fatigue,
        focus,
        confidence_before: confidenceBefore,
        confidence_after: confidenceAfter,
        pressure_mode: pressureMode,
        pressure_pass: pressureMode ? pressurePass : null,
        started_at: startTime,
        completed_at: new Date().toISOString(),
        status: "completed",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shooting-sessions"] });
      toast.success("Session saved!");
      navigate("/client/labs/hoops");
    },
    onError: () => toast.error("Failed to save session"),
  });

  // Pre-session setup
  if (!sessionStarted) {
    return (
      <ClientLayout>
        <div className="p-4 space-y-4 pb-24">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/client/labs/hoops")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold">New Shooting Session</h1>
          </div>

          <Card className="border-border/60">
            <CardContent className="p-4 space-y-5">
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">Drill Type</label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {DRILL_TYPES.map((dt) => (
                    <Button
                      key={dt}
                      size="sm"
                      variant={drillType === dt ? "default" : "outline"}
                      onClick={() => setDrillType(dt)}
                      className="text-xs capitalize"
                    >
                      {dt.replace("-", " ")}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold uppercase text-muted-foreground">Pressure Mode</label>
                  <p className="text-[10px] text-muted-foreground">Must hit 8/10 to pass</p>
                </div>
                <Button
                  size="sm"
                  variant={pressureMode ? "default" : "outline"}
                  onClick={() => setPressureMode(!pressureMode)}
                  className="text-xs"
                >
                  <Target className="h-3.5 w-3.5 mr-1" />
                  {pressureMode ? "ON" : "OFF"}
                </Button>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">
                  Confidence Level: {confidenceBefore}
                </label>
                <Slider
                  value={[confidenceBefore]}
                  onValueChange={([v]) => setConfidenceBefore(v)}
                  max={10}
                  step={1}
                  className="mt-2"
                />
              </div>

              <Button className="w-full h-12 font-bold" onClick={() => setSessionStarted(true)}>
                Start Session
              </Button>
            </CardContent>
          </Card>
        </div>
      </ClientLayout>
    );
  }

  // Active session
  return (
    <ClientLayout>
      <div className="p-4 space-y-4 pb-24">
        {/* Shot counter */}
        <div className="text-center">
          <p className="text-5xl font-black tabular-nums">{attempts}</p>
          <p className="text-xs font-bold uppercase text-muted-foreground mt-1">Total Shots</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-2xl font-black text-emerald-400">{makes}</p>
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Makes</p>
          </div>
          <div>
            <p className="text-2xl font-black text-red-400">{misses}</p>
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Misses</p>
          </div>
          <div>
            <p className="text-2xl font-black text-orange-400">{accuracy}%</p>
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Accuracy</p>
          </div>
        </div>

        {/* Streak display */}
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-orange-400" />
            <span className="text-sm font-bold">Streak: {streak}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Best: {bestStreak}
          </div>
        </div>

        {/* Pressure mode indicator */}
        {pressureMode && (
          <Card className={`border-2 ${pressurePass ? "border-emerald-500 bg-emerald-500/10" : "border-orange-500/50 bg-orange-500/5"}`}>
            <CardContent className="p-3 text-center">
              <p className="text-xs font-bold uppercase">
                {pressurePass ? "🔥 PRESSURE PASS!" : `Pressure: ${lastTenMakes}/10 last shots`}
              </p>
            </CardContent>
          </Card>
        )}

        {/* MAKE / MISS buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            className="h-24 text-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => logShot(true)}
          >
            MAKE
          </Button>
          <Button
            className="h-24 text-xl font-black bg-red-600 hover:bg-red-700 text-white"
            onClick={() => logShot(false)}
          >
            MISS
          </Button>
        </div>

        {/* Undo */}
        {attempts > 0 && (
          <Button variant="ghost" size="sm" onClick={undoLast} className="w-full text-xs text-muted-foreground">
            Undo Last Shot
          </Button>
        )}

        {/* End Session */}
        {attempts > 0 && (
          <Card className="border-border/60">
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">
                  Fatigue Level: {fatigue}
                </label>
                <Slider
                  value={[fatigue]}
                  onValueChange={([v]) => setFatigue(v)}
                  max={10}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">
                  Focus Level: {focus}
                </label>
                <Slider
                  value={[focus]}
                  onValueChange={([v]) => setFocus(v)}
                  max={10}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">
                  Confidence After: {confidenceAfter}
                </label>
                <Slider
                  value={[confidenceAfter]}
                  onValueChange={([v]) => setConfidenceAfter(v)}
                  max={10}
                  step={1}
                  className="mt-2"
                />
              </div>
              <Button
                className="w-full h-12 font-bold"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                <Check className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : "Complete Session"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </ClientLayout>
  );
}
