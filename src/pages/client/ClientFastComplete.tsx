import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Flame, Zap, Timer, Flame as FlameIcon, ExternalLink, Activity, Droplets } from "lucide-react";
import { FASTING_STAGES } from "@/lib/fastingStages";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, isToday } from "date-fns";
import { useEffect, useState, useRef } from "react";

const TRAINERIZE_URL = "https://www.trainerize.com/login.aspx";

const REFEED_TIPS = [
  "Start light — broth, water, or a small protein-forward bite.",
  "Electrolytes first: sodium, potassium, magnesium.",
  "Give it 20–30 minutes before a full meal.",
  "Log what you eat in Trainerize so your coach sees it.",
];

// Confetti particle component
function ConfettiParticle({ delay, x }: { delay: number; x: number }) {
  const colors = ["bg-amber-400", "bg-emerald-400", "bg-sky-400", "bg-purple-400", "bg-pink-400", "bg-primary"];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const size = 4 + Math.random() * 6;
  const rotation = Math.random() * 360;
  const duration = 1.5 + Math.random() * 1.5;

  return (
    <div
      className={`absolute rounded-sm ${color} pointer-events-none`}
      style={{
        width: size,
        height: size * 0.6,
        left: `${x}%`,
        top: -10,
        transform: `rotate(${rotation}deg)`,
        animation: `confetti-fall ${duration}s ease-out ${delay}s forwards`,
        opacity: 0,
      }}
    />
  );
}

function ConfettiOverlay() {
  const particles = useRef(
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      delay: Math.random() * 0.8,
      x: 5 + Math.random() * 90,
    }))
  ).current;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
      <style>{`
        @keyframes confetti-fall {
          0% { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(70vh) rotate(720deg); }
        }
      `}</style>
      {particles.map((p) => (
        <ConfettiParticle key={p.id} delay={p.delay} x={p.x} />
      ))}
    </div>
  );
}

export default function ClientFastComplete() {
  const clientId = useEffectiveClientId();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.get("demo") === "1";
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  // Feature settings for eating window
  const { data: settings } = useQuery({
    queryKey: ["fast-complete-settings", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_feature_settings")
        .select("active_fast_start_at, eating_window_ends_at, last_fast_ended_at, last_fast_completed_at, eating_window_hours")
        .eq("client_id", clientId!)
        .maybeSingle();
      return data;
    },
    enabled: !!clientId,
  });

  const now = new Date();
  const hasCompletedFastToday = !!settings?.last_fast_completed_at && isToday(new Date(settings.last_fast_completed_at));
  const hasActiveFuelPhase = !!settings?.eating_window_ends_at && new Date(settings.eating_window_ends_at) > now;
  const shouldBlockFastComplete = !isDemo && !!settings && (!hasCompletedFastToday || !hasActiveFuelPhase || !!settings.active_fast_start_at);

  useEffect(() => {
    if (!shouldBlockFastComplete) return;
    navigate("/client/dashboard", { replace: true });
  }, [navigate, shouldBlockFastComplete]);

  // Last completed fast (stats)
  const { data: lastFast } = useQuery({
    queryKey: ["fast-complete-last-fast", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("fasting_log")
        .select("started_at, ended_at, target_hours, actual_hours")
        .eq("client_id", clientId!)
        .not("ended_at", "is", null)
        .order("ended_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!clientId,
  });

  // Streak
  const { data: streak } = useQuery({
    queryKey: ["fast-complete-streak", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_consistency_streaks")
        .select("current_streak, longest_streak")
        .eq("client_id", clientId!)
        .maybeSingle();
      return data;
    },
    enabled: !!clientId,
  });

  // Compute eating window times
  const eatingStart = (demoSettings ?? settings)?.last_fast_ended_at
    ? format(new Date(((demoSettings ?? settings) as any).last_fast_ended_at), "h:mm a")
    : "Now";
  const eatingEnd = (demoSettings ?? settings)?.eating_window_ends_at
    ? format(new Date(((demoSettings ?? settings) as any).eating_window_ends_at), "h:mm a")
    : null;

  const demoNow = now.getTime();
  const demoSettings = isDemo
    ? {
        last_fast_ended_at: new Date(demoNow - 15 * 60000).toISOString(),
        eating_window_ends_at: new Date(demoNow + 6.2 * 3600000).toISOString(),
        eating_window_hours: 6,
      }
    : null;
  const demoFast = isDemo
    ? { actual_hours: 18.4, target_hours: 18, started_at: null, ended_at: null }
    : null;

  const actualHours =
    demoFast?.actual_hours ??
    lastFast?.actual_hours ??
    (lastFast?.started_at && lastFast?.ended_at
      ? (new Date(lastFast.ended_at).getTime() - new Date(lastFast.started_at).getTime()) / 3600000
      : null);
  const targetHours = demoFast?.target_hours ?? lastFast?.target_hours ?? null;
  const stageReached =
    actualHours != null
      ? [...FASTING_STAGES].reverse().find((st) => actualHours >= st.minHours) || FASTING_STAGES[0]
      : null;

  const effSettings = (demoSettings ?? settings) as typeof settings;
  const msLeft = effSettings?.eating_window_ends_at
    ? new Date(effSettings.eating_window_ends_at).getTime() - now.getTime()
    : null;
  const closesInLabel =
    msLeft != null && msLeft > 0
      ? `${Math.floor(msLeft / 3600000)}h ${Math.floor((msLeft % 3600000) / 60000)}m`
      : null;

  if (shouldBlockFastComplete) {
    return null;
  }

  return (
    <ClientLayout>
      <div className="min-h-[calc(100dvh-80px)] flex flex-col px-5 py-8 relative">
        {/* Confetti */}
        {showConfetti && <ConfettiOverlay />}

        {/* Hero */}
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in">
          {/* Animated success ring */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-primary/15 blur-2xl animate-pulse" />
            <div className="absolute -inset-2 rounded-full border-2 border-primary/20 animate-[spin_8s_linear_infinite]" />
            <div className="relative h-28 w-28 rounded-full bg-gradient-to-br from-amber-400 via-primary to-primary/60 flex items-center justify-center shadow-2xl shadow-primary/30">
              <Flame className="h-14 w-14 text-primary-foreground drop-shadow-lg" />
            </div>
          </div>

          <div className="space-y-3 max-w-sm">
            <h1 className="text-3xl font-extrabold tracking-tight">🔥 Fast Complete</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Great job — you completed <strong className="text-foreground">Part 1</strong> of your protocol.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your body is now <strong className="text-foreground">insulin-sensitive</strong> and primed for fuel.
            </p>
          </div>
        </div>

        {/* Part 2 Header */}
        <div className="flex items-center gap-3 mt-6 mb-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Your Fast Recap</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Info Cards */}
        <div className="space-y-4 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          {/* Fast stats */}
          <div className="rounded-2xl border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wide">The Numbers</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <StatTile label="Fasted" value={actualHours != null ? `${actualHours.toFixed(1)}h` : "—"} />
              <StatTile label="Target" value={targetHours != null ? `${targetHours}h` : "—"} />
              <StatTile label="Streak" value={`${isDemo ? 12 : streak?.current_streak ?? 0}d`} />
            </div>
            <div className="rounded-xl bg-muted/50 p-3 space-y-1">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Deepest stage reached</p>
              <p className="text-base font-bold" style={{ color: stageReached?.dotColor }}>
                {stageReached ? stageReached.label : "—"}
              </p>
              {stageReached && (
                <p className="text-xs text-muted-foreground">{stageReached.description}</p>
              )}
            </div>
          </div>

          {/* Fuel window timing */}
          <div className="rounded-2xl border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wide">Your Fuel Window</h2>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 space-y-1">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">You can eat</p>
              <p className="text-base font-bold">
                {eatingEnd ? `${eatingStart} – ${eatingEnd}` : `${(demoSettings ?? settings)?.eating_window_hours || 8}h window`}
              </p>
            </div>
            {closesInLabel && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Timer className="h-3.5 w-3.5" />
                Window closes in {closesInLabel}
              </p>
            )}
          </div>

          {/* Refeed guidance */}
          <div className="rounded-2xl border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wide">Break It Well</h2>
            </div>
            <ul className="space-y-2">
              {REFEED_TIPS.map((tip) => (
                <li key={tip} className="flex items-start gap-2 text-sm text-foreground/85">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 space-y-3 pb-4 animate-fade-in" style={{ animationDelay: "0.6s" }}>
          <Button
            className="w-full h-14 text-base font-bold rounded-2xl shadow-lg shadow-primary/20"
            onClick={() => navigate("/client/dashboard")}
          >
            <FlameIcon className="h-5 w-5 mr-2" />
            Back to Today
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 text-sm font-medium rounded-2xl"
            onClick={() => window.open(TRAINERIZE_URL, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Log meals in Trainerize
          </Button>
          <Button
            variant="ghost"
            className="w-full text-sm text-muted-foreground"
            onClick={() => navigate("/client/timeline")}
          >
            View my timeline
          </Button>
        </div>
      </div>
    </ClientLayout>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3 text-center space-y-1">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
