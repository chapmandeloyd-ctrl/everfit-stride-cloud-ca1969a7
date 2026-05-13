import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { ClientLayout } from "@/components/ClientLayout";
import {
  InteractiveKetoTypeCard,
  type KetoTypeForCard,
} from "@/components/keto/InteractiveKetoTypeCard";

/**
 * Dark-style keto library — mirrors ClientPrograms (/client/programs).
 * Uses InteractiveKetoTypeCard (tap-to-flip) for every keto type, grouped
 * by category, with the assigned type pinned at top as "Your Current".
 */

interface KetoCategory {
  id: string;
  name: string;
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
  how_it_works: string | null;
  built_for: string[] | null;
  category_id: string;
  color: string;
  order_index: number;
}

function toKetoCardData(kt: KetoType): KetoTypeForCard {
  return {
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
  };
}

export default function ClientKetoTypes() {
  const navigate = useNavigate();
  const location = useLocation();
  const clientId = useEffectiveClientId();
  const queryClient = useQueryClient();

  // Pending pairing handoff from the protocol detail page. When set, the user
  // is mid-flight building their KSOM-360 Synergy program and is here to pick
  // a keto type to pair with the chosen protocol.
  const pendingProtocol = (location.state as {
    pendingProtocol?: { type: "quick" | "program"; id: string; name: string };
  } | null)?.pendingProtocol ?? null;

  const navState = pendingProtocol ? { state: { pendingProtocol } } : undefined;

  // Realtime: refresh when trainer updates keto macros
  useEffect(() => {
    const channel = supabase
      .channel("keto-list-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "keto_types" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["keto-types"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["keto-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("keto_categories")
        .select("id, name, color, order_index")
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as KetoCategory[];
    },
  });

  const { data: ketoTypes } = useQuery({
    queryKey: ["keto-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("keto_types")
        .select(
          "id, abbreviation, name, subtitle, description, fat_pct, protein_pct, carbs_pct, carb_limit_grams, difficulty, how_it_works, built_for, category_id, color, order_index",
        )
        .eq("is_active", true)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as KetoType[];
    },
  });

  const { data: featureSettings } = useQuery({
    queryKey: ["keto-preview-feature-settings", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data } = await supabase
        .from("client_feature_settings")
        .select("lock_client_plan_choice")
        .eq("client_id", clientId)
        .maybeSingle();
      return data;
    },
    enabled: !!clientId,
  });

  const { data: activeAssignment } = useQuery({
    queryKey: ["client-keto-assignment", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from("client_keto_assignments")
        .select("keto_type_id")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const isLocked = !!featureSettings?.lock_client_plan_choice;
  const assignedKetoId = activeAssignment?.keto_type_id ?? null;

  const assignedKeto = ketoTypes?.find((k) => k.id === assignedKetoId) ?? null;

  const grouped =
    categories?.map((cat) => ({
      category: cat,
      items: ketoTypes?.filter((t) => t.category_id === cat.id) || [],
    })).filter((g) => g.items.length > 0) || [];

  // Uniform card heights across the whole list.
  const [heights, setHeights] = useState<Record<string, number>>({});
  const tallest = useMemo(() => {
    const vals = Object.values(heights);
    return vals.length ? Math.max(...vals) : 0;
  }, [heights]);
  const makeOnMeasure = useCallback(
    (key: string) => (h: number) => {
      setHeights((prev) => (prev[key] === h ? prev : { ...prev, [key]: h }));
    },
    [],
  );

  return (
    <ClientLayout>
      <div className="max-w-md mx-auto px-4 pt-4 pb-32 space-y-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-foreground/80 hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-black tracking-tight">All Keto Types</h1>
        </div>

        {pendingProtocol && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-primary/40 bg-primary/10">
            <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold">
                Building your KSOM-360 Synergy program
              </p>
              <p className="text-sm">
                Pick a keto type to pair with{" "}
                <span className="font-semibold">{pendingProtocol.name}</span>
              </p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="text-[10px] uppercase tracking-wider px-2 py-1 text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        )}

        {isLocked && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs">
            <ShieldCheck className="h-3.5 w-3.5" />
            Plan selection is locked by your coach.
          </div>
        )}

        {isLoading && (
          <p className="text-xs text-muted-foreground">Loading…</p>
        )}

        {assignedKeto && (
          <section className="space-y-3">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">
              Your Current Keto Type
            </p>
            <InteractiveKetoTypeCard
              ketoType={toKetoCardData(assignedKeto)}
              themeColor={assignedKeto.color || undefined}
              isCurrent
              hideExportPdf
              onMeasureHeight={makeOnMeasure(assignedKeto.id)}
              forcedHeight={tallest > 0 ? tallest : undefined}
            />
          </section>
        )}

        {grouped.map((group) => {
          const items = group.items.filter((t) => t.id !== assignedKetoId);
          if (items.length === 0) return null;
          return (
            <section key={group.category.id} className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground">
                {group.category.name}
              </p>
              <div className="space-y-6">
                {items.map((kt) => {
                  return (
                    <InteractiveKetoTypeCard
                      key={kt.id}
                      ketoType={toKetoCardData(kt)}
                      themeColor={kt.color || undefined}
                      isCurrent={false}
                      dimmed
                      hideExportPdf
                      onMeasureHeight={makeOnMeasure(kt.id)}
                      forcedHeight={tallest > 0 ? tallest : undefined}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}

        {!isLoading && grouped.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No keto types available yet. Your coach will set these up for you.
          </p>
        )}
      </div>
    </ClientLayout>
  );
}
