import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Flame, Zap, BarChart3, UtensilsCrossed, PenLine } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useNavigate } from "react-router-dom";
import { format, isToday } from "date-fns";
import { useEffect, useState, useRef } from "react";

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
  const shouldBlockFastComplete = !!settings && (!hasCompletedFastToday || !hasActiveFuelPhase || !!settings.active_fast_start_at);

  useEffect(() => {
    if (!shouldBlockFastComplete) return;
    navigate("/client/dashboard", { replace: true });
  }, [navigate, shouldBlockFastComplete]);

  if (shouldBlockFastComplete) {
    return null;
  }

  // Keto type
  const { data: ketoType } = useQuery({
    queryKey: ["fast-complete-keto", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_keto_assignments")
        .select("keto_type_id, keto_types (name, abbreviation, color, fat_pct, protein_pct, carbs_pct)")
        .eq("client_id", clientId!)
        .eq("is_active", true)
        .maybeSingle();
      return (data as any)?.keto_types || null;
    },
    enabled: !!clientId,
  });

  // Macro targets
  const { data: macros } = useQuery({
    queryKey: ["fast-complete-macros", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_macro_targets")
        .select("target_protein, target_fats, target_carbs, target_calories")
        .eq("client_id", clientId!)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    enabled: !!clientId,
  });

  // Compute eating window times
  const eatingStart = settings?.last_fast_ended_at
    ? format(new Date(settings.last_fast_ended_at), "h:mm a")
    : "Now";
  const eatingEnd = settings?.eating_window_ends_at
    ? format(new Date(settings.eating_window_ends_at), "h:mm a")
    : null;

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
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Part 2: Fuel Phase</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Info Cards */}
        <div className="space-y-4 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          {/* Next Phase */}
          <div className="rounded-2xl border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wide">Your Fuel Window</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/50 p-3 space-y-1">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Eating Window</p>
                <p className="text-base font-bold">
                  {eatingEnd ? `${eatingStart} – ${eatingEnd}` : `${settings?.eating_window_hours || 8}h window`}
                </p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3 space-y-1">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Keto Type</p>
                <p className="text-base font-bold">
                  {ketoType?.abbreviation || ketoType?.name || "Standard"}
                </p>
              </div>
            </div>
          </div>

          {/* Macros */}
          <div className="rounded-2xl border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wide">Your Macros</h2>
            </div>

            {macros ? (
              <div className="grid grid-cols-3 gap-3">
                <MacroTile label="Protein" value={`${macros.target_protein || 0}g`} color="bg-blue-500" />
                <MacroTile label="Fat" value={`${macros.target_fats || 0}g`} color="bg-amber-500" />
                <MacroTile label="Carbs" value={`${macros.target_carbs || 0}g`} color="bg-emerald-500" />
              </div>
            ) : ketoType ? (
              <div className="grid grid-cols-3 gap-3">
                <MacroTile label="Protein" value={`${ketoType.protein_pct || 0}%`} color="bg-blue-500" />
                <MacroTile label="Fat" value={`${ketoType.fat_pct || 0}%`} color="bg-amber-500" />
                <MacroTile label="Carbs" value={`${ketoType.carbs_pct || 0}%`} color="bg-emerald-500" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No macro targets set yet.</p>
            )}

            <p className="text-xs text-muted-foreground leading-relaxed">
              These macros keep you in fat-burning while supporting recovery.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 space-y-3 pb-4 animate-fade-in" style={{ animationDelay: "0.6s" }}>
          <Button
            className="w-full h-14 text-base font-bold rounded-2xl shadow-lg shadow-primary/20"
            onClick={() => navigate("/client/meal-select?from=fast_complete")}
          >
            <UtensilsCrossed className="h-5 w-5 mr-2" />
            Choose Your Meal
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 text-sm font-medium rounded-2xl"
            onClick={() => navigate("/client/log-meal")}
          >
            <PenLine className="h-4 w-4 mr-2" />
            Track Your Own Meal
          </Button>
          <Button
            variant="ghost"
            className="w-full text-sm text-muted-foreground"
            onClick={() => navigate("/client/dashboard")}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </ClientLayout>
  );
}

function MacroTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3 text-center space-y-1.5">
      <div className={`h-2 w-2 rounded-full ${color} mx-auto`} />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
