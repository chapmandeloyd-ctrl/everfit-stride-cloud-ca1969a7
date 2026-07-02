import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Utensils, Flame, Info } from "lucide-react";
import { computePlan } from "@/lib/protocolPlan";
import { useMemo } from "react";

/**
 * Compact "Today's Window" card rendered directly below the lion FastingProtocolCard.
 * Read-only, presentation-only. Never modifies the lion card.
 */
export function TodaysWindowCard() {
  const clientId = useEffectiveClientId();

  const { data: settings } = useQuery({
    queryKey: ["tw-settings", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_feature_settings")
        .select("selected_protocol_id, selected_quick_plan_id, protocol_start_date")
        .eq("client_id", clientId!)
        .maybeSingle();
      return data;
    },
    enabled: !!clientId,
  });

  const protocolId = settings?.selected_protocol_id;
  const quickId = settings?.selected_quick_plan_id;
  const activeId = protocolId || quickId;

  const { data: protocol } = useQuery({
    queryKey: ["tw-protocol", activeId, !!protocolId],
    queryFn: async () => {
      if (protocolId) {
        const { data } = await supabase
          .from("fasting_protocols")
          .select("name, fast_target_hours")
          .eq("id", protocolId)
          .maybeSingle();
        return data;
      }
      const { data } = await supabase
        .from("quick_fasting_plans")
        .select("name, fast_hours")
        .eq("id", quickId!)
        .maybeSingle();
      return data ? { name: data.name, fast_target_hours: data.fast_hours } : null;
    },
    enabled: !!activeId,
  });

  const { data: ketoAssignment } = useQuery({
    queryKey: ["tw-keto", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_keto_assignments")
        .select("keto_type_id")
        .eq("client_id", clientId!)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    enabled: !!clientId,
  });

  const { data: ketoType } = useQuery({
    queryKey: ["tw-keto-type", ketoAssignment?.keto_type_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("keto_types")
        .select("abbreviation, name, protein_pct, carbs_pct, fat_pct, color")
        .eq("id", ketoAssignment!.keto_type_id!)
        .maybeSingle();
      return data;
    },
    enabled: !!ketoAssignment?.keto_type_id,
  });

  const { data: weightLbs } = useQuery({
    queryKey: ["tw-weight", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data: defs } = await supabase
        .from("metric_definitions")
        .select("id")
        .eq("name", "Weight")
        .limit(1);
      const defId = defs?.[0]?.id;
      if (!defId) return null;
      const { data: cm } = await supabase
        .from("client_metrics")
        .select("id")
        .eq("client_id", clientId)
        .eq("metric_definition_id", defId)
        .limit(1);
      const cmId = cm?.[0]?.id;
      if (!cmId) return null;
      const { data: entry } = await supabase
        .from("metric_entries")
        .select("value")
        .eq("client_metric_id", cmId)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (entry as any)?.value ?? null;
    },
    enabled: !!clientId,
  });

  const plan = useMemo(() => {
    if (!ketoType || !weightLbs || !protocol) return null;
    return computePlan({
      weightLbs: Number(weightLbs),
      ketoType: ketoType as any,
      protocol: { name: protocol.name, fast_target_hours: protocol.fast_target_hours },
      planType: "recurring",
      planLengthDays: 7,
    });
  }, [ketoType, weightLbs, protocol]);

  // Which day of the plan are we on?
  const dayIndex = useMemo(() => {
    if (!plan) return 0;
    const start = settings?.protocol_start_date ? new Date(settings.protocol_start_date) : new Date();
    const diffDays = Math.floor((Date.now() - start.getTime()) / 86_400_000);
    return ((diffDays % plan.days.length) + plan.days.length) % plan.days.length;
  }, [plan, settings?.protocol_start_date]);

  if (!plan) return null;
  const today = plan.days[dayIndex];
  if (!today) return null;

  const accent = (ketoType as any)?.color || "hsl(var(--primary))";
  const isFastDay = today.adFast;
  const isRefeed = today.isRefeed;

  return (
    <Card className="overflow-hidden border-border/60 bg-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full"
              style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
            />
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              Today's Window
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {today.omad && <Badge variant="outline" className="text-[9px] px-1.5 py-0">OMAD</Badge>}
            {today.tight && !today.omad && <Badge variant="outline" className="text-[9px] px-1.5 py-0">Tight</Badge>}
            {isRefeed && (
              <Badge className="text-[9px] px-1.5 py-0 bg-primary/15 text-primary border border-primary/30">
                REFEED
              </Badge>
            )}
            {isFastDay && (
              <Badge className="text-[9px] px-1.5 py-0 bg-primary/15 text-primary border border-primary/30">
                FAST DAY
              </Badge>
            )}
          </div>
        </div>

        {isFastDay ? (
          <div className="rounded-lg border border-border/60 p-3 bg-muted/30">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">{today.fastWindow}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Water + electrolytes. No calories today.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <WindowTile
              icon={<Utensils className="h-3.5 w-3.5" />}
              label="Break fast"
              value={today.eatStart}
            />
            <WindowTile
              icon={<Clock className="h-3.5 w-3.5" />}
              label="Last meal by"
              value={today.eatEnd}
            />
          </div>
        )}

        {!isFastDay && (
          <div className="grid grid-cols-4 gap-2 pt-1">
            <MacroTile label="Cal" value={today.cal} />
            <MacroTile label="Protein" value={`${today.proteinG}g`} accent />
            <MacroTile label="Carbs" value={`${today.carbG}g`} />
            <MacroTile label="Fat" value={`${today.fatG}g`} />
          </div>
        )}

        {isRefeed && (
          <div className="flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/5 p-2">
            <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-foreground/80 leading-snug">
              Refeed day — prioritize clean carbs & lean protein. Avoid sugar and seed oils.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WindowTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 p-2.5 bg-muted/20">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <p className="text-[10px] uppercase tracking-wider font-medium">{label}</p>
      </div>
      <p className="text-sm font-bold mt-1 tabular-nums">{value || "—"}</p>
    </div>
  );
}

function MacroTile({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`rounded-md border p-1.5 text-center ${accent ? "border-primary/30 bg-primary/5" : "border-border/60 bg-muted/20"}`}>
      <p className="text-sm font-bold tabular-nums leading-none">{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
