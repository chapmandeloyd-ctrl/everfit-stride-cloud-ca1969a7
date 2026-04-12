import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Flame, Zap, BarChart3, UtensilsCrossed } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

export default function ClientFastComplete() {
  const clientId = useEffectiveClientId();
  const navigate = useNavigate();

  // Feature settings for eating window
  const { data: settings } = useQuery({
    queryKey: ["fast-complete-settings", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_feature_settings")
        .select("eating_window_ends_at, last_fast_ended_at, eating_window_hours")
        .eq("client_id", clientId!)
        .maybeSingle();
      return data;
    },
    enabled: !!clientId,
  });

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
      <div className="min-h-[calc(100dvh-80px)] flex flex-col px-5 py-8">
        {/* Hero */}
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
          {/* Animated glow ring */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl animate-pulse" />
            <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
              <Flame className="h-12 w-12 text-primary-foreground" />
            </div>
          </div>

          <div className="space-y-3 max-w-sm">
            <h1 className="text-2xl font-extrabold tracking-tight">🔥 Fast Complete</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Great job — you've successfully completed <strong className="text-foreground">Part 1</strong> of your fasting protocol.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your body is now in a <strong className="text-foreground">peak fat-burning</strong> and <strong className="text-foreground">insulin-sensitive</strong> state.
            </p>
            <p className="text-sm font-semibold text-foreground mt-2">
              Now we shift into Part 2 — <span className="text-primary">Fueling</span>.
            </p>
          </div>
        </div>

        {/* Info Cards */}
        <div className="space-y-4 mt-6">
          {/* Next Phase */}
          <div className="rounded-2xl border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wide">Your Next Phase</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/50 p-3 space-y-1">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Keto Type</p>
                <p className="text-base font-bold">
                  {ketoType?.abbreviation || ketoType?.name || "Standard"}
                </p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3 space-y-1">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Eating Window</p>
                <p className="text-base font-bold">
                  {eatingEnd ? `${eatingStart} – ${eatingEnd}` : `${settings?.eating_window_hours || 8}h`}
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
        <div className="mt-8 space-y-3 pb-4">
          <Button
            className="w-full h-14 text-base font-bold rounded-2xl shadow-lg shadow-primary/20"
            onClick={() => navigate("/client/meal-plan")}
          >
            <UtensilsCrossed className="h-5 w-5 mr-2" />
            View My Meals
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
