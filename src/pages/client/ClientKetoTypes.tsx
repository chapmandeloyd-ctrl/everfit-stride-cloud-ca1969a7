import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { ClientLayout } from "@/components/ClientLayout";
import { InteractiveKetoTypeCard } from "@/components/keto/InteractiveKetoTypeCard";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PlanLockedDialog } from "@/components/PlanLockedDialog";

interface KetoCategory {
  id: string;
  name: string;
  icon_name: string;
  color: string;
  order_index: number;
}

interface KetoType {
  id: string;
  abbreviation: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  fat_pct: number;
  protein_pct: number;
  carbs_pct: number;
  carb_limit_grams: number | null;
  difficulty: string;
  color: string;
  category_id: string;
  order_index: number;
  how_it_works: string | null;
  built_for: string[] | null;
}

export default function ClientKetoTypes() {
  const navigate = useNavigate();
  const clientId = useEffectiveClientId();
  const queryClient = useQueryClient();
  const [showLocked, setShowLocked] = useState(false);

  // Realtime: refresh when trainer updates keto macros
  useEffect(() => {
    const channel = supabase
      .channel("keto-list-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "keto_types" }, () => {
        queryClient.invalidateQueries({ queryKey: ["keto-types"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["keto-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("keto_categories")
        .select("*")
        .order("order_index");
      if (error) throw error;
      return data as KetoCategory[];
    },
  });

  const { data: ketoTypes } = useQuery({
    queryKey: ["keto-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("keto_types")
        .select("*")
        .eq("is_active", true)
        .order("order_index");
      if (error) throw error;
      return data as KetoType[];
    },
  });

  const { data: activeAssignment } = useQuery({
    queryKey: ["client-keto-assignment", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from("client_keto_assignments")
        .select("*, keto_types(*)")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const activeKetoTypeId = activeAssignment?.keto_type_id;

  const grouped = categories?.map((cat) => ({
    category: cat,
    items: ketoTypes?.filter((t) => t.category_id === cat.id) || [],
  })).filter((g) => g.items.length > 0) || [];

  // Collect each card's auto-measured height, then feed back the max so all
  // cards in the list end up the same height (no dead space, no clipping).
  const [heights, setHeights] = useState<Record<string, number>>({});
  const tallest = useMemo(() => {
    const vals = Object.values(heights);
    return vals.length ? Math.max(...vals) : 0;
  }, [heights]);
  const makeOnMeasure = useCallback(
    (key: string) => (h: number) => {
      setHeights((prev) => (prev[key] === h ? prev : { ...prev, [key]: h }));
    },
    []
  );

  return (
    <ClientLayout>
      <div className="px-3 pt-4 pb-8 space-y-6 w-full">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-primary">KSOM Keto System</span>
          </div>
          <h1 className="text-2xl font-bold">Keto Types</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choose your nutrition framework. Each type controls what you eat — your fasting protocol controls when.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : grouped.length > 0 ? (
          grouped.map((group) => (
            <div key={group.category.id} className="space-y-3">
              {/* Category header */}
              <div className="flex items-center gap-2">
                <div
                  className="h-6 w-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${group.category.color}15` }}
                >
                  <Zap className="h-3 w-3" style={{ color: group.category.color }} />
                </div>
                <h2
                  className="text-sm font-bold"
                  style={{ color: group.category.color }}
                >
                  {group.category.name}
                </h2>
              </div>

              {/* Keto type cards — full interactive design.
                  Active card shows everything; locked cards are dimmed and
                  hide their detail sections (consistent with protocol library). */}
              {group.items.map((kt) => {
                const isActive = kt.id === activeKetoTypeId;
                return (
                  <InteractiveKetoTypeCard
                    key={kt.id}
                    ketoType={{
                      abbreviation: kt.abbreviation,
                      name: kt.name,
                      subtitle: kt.subtitle,
                      description: kt.description,
                      difficulty: kt.difficulty,
                      fat_pct: kt.fat_pct,
                      protein_pct: kt.protein_pct,
                      carbs_pct: kt.carbs_pct,
                      carb_limit_grams: kt.carb_limit_grams,
                      how_it_works: kt.how_it_works,
                      built_for: kt.built_for,
                      color: kt.color,
                    }}
                    themeColor={kt.color}
                    isCurrent={isActive}
                    dimmed={!isActive}
                    hideExportPdf={!isActive}
                    onOpen={
                      isActive
                        ? () => navigate(`/client/keto-types/${kt.id}`)
                        : () => setShowLocked(true)
                    }
                    openLabel={isActive ? "Open keto details" : "Locked — message your trainer"}
                    onMeasureHeight={makeOnMeasure(kt.id)}
                    forcedHeight={tallest > 0 ? tallest : undefined}
                  />
                );
              })}
            </div>
          ))
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <Zap className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No keto types available yet</p>
            <p className="text-sm mt-1">Your coach will set these up for you.</p>
          </div>
        )}
      </div>

      <PlanLockedDialog
        open={showLocked}
        onOpenChange={setShowLocked}
        lockMessage="Message your trainer to request a different keto type."
      />
    </ClientLayout>
  );
}
