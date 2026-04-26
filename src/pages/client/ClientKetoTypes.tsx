import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { X, Lock } from "lucide-react";
import lionLogo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";

/**
 * Editorial Black & Gold preview of the entire KSOM keto type library.
 * Mirrors ClientFastingPlansPreview so the "View Keto Type" entry point
 * matches the "View Protocol" entry point exactly (lion + big numbers).
 */

const GOLD = "hsl(42 70% 55%)";
const IVORY = "hsl(40 20% 92%)";
const MUTED = "hsl(40 10% 65%)";
const BLACK = "hsl(0 0% 4%)";
const CARD_BG = "hsl(0 0% 7%)";

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
  difficulty: string;
  category_id: string;
  color: string;
  order_index: number;
}

function KetoLionCard({
  abbreviation,
  name,
  subtitle,
  fatPct,
  proteinPct,
  carbsPct,
  locked,
  isAssigned,
  onClick,
}: {
  abbreviation: string;
  name: string;
  subtitle: string | null;
  fatPct: number;
  proteinPct: number;
  carbsPct: number;
  locked: boolean;
  isAssigned: boolean;
  onClick: () => void;
}) {
  // The "big numbers" treatment: show ABBR (e.g. CKD) as the headline number
  // and the full name as the editorial title underneath.
  const split = `${Math.round(fatPct)}/${Math.round(proteinPct)}/${Math.round(carbsPct)}`;
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative w-full text-left overflow-hidden p-5 transition active:scale-[0.99]"
      style={{ background: CARD_BG, border: `1px solid ${GOLD}30` }}
    >
      <img
        src={lionLogo}
        alt=""
        aria-hidden
        className="absolute -right-10 top-1/2 -translate-y-1/2 w-44 h-44 object-contain pointer-events-none"
        style={{
          filter: "sepia(1) hue-rotate(-15deg) saturate(2.5) brightness(1.2)",
          opacity: locked ? 0.08 : 0.18,
        }}
      />
      {locked && (
        <div
          className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] uppercase tracking-widest font-bold"
          style={{ background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}50` }}
        >
          <Lock className="h-2.5 w-2.5" />
          Locked
        </div>
      )}
      {isAssigned && !locked && (
        <div
          className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] uppercase tracking-widest font-bold"
          style={{ background: GOLD, color: BLACK }}
        >
          ★ Yours
        </div>
      )}
      <div className="relative space-y-2 max-w-[62%]">
        <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: GOLD }}>
          {split} F/P/C
        </p>
        <p
          className="text-3xl font-light tracking-tight leading-none"
          style={{ color: GOLD, fontFamily: "Georgia, serif" }}
        >
          {abbreviation}
        </p>
        <h3
          className="text-lg font-light tracking-tight leading-tight"
          style={{ color: locked ? MUTED : IVORY, fontFamily: "Georgia, serif" }}
        >
          {name}
        </h3>
        {subtitle && (
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: MUTED }}>
            {subtitle}
          </p>
        )}
      </div>
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.4em]" style={{ color: MUTED }}>
      {children}
    </p>
  );
}

export default function ClientKetoTypes() {
  const navigate = useNavigate();
  const clientId = useEffectiveClientId();
  const queryClient = useQueryClient();

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
          "id, abbreviation, name, subtitle, description, fat_pct, protein_pct, carbs_pct, difficulty, category_id, color, order_index",
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

  const grouped =
    categories?.map((cat) => ({
      category: cat,
      items: ketoTypes?.filter((t) => t.category_id === cat.id) || [],
    })).filter((g) => g.items.length > 0) || [];

  return (
    <div className="min-h-screen" style={{ background: BLACK }}>
      <div
        className="sticky top-0 z-10 flex items-center gap-2 p-3"
        style={{ background: BLACK, borderBottom: `1px solid ${GOLD}20` }}
      >
        <button onClick={() => navigate(-1)} className="p-2" style={{ color: IVORY }}>
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="px-5 pt-4 pb-12 space-y-8">
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.4em]" style={{ color: GOLD }}>
            The Nutrition Framework
          </p>
          <h1
            className="text-4xl font-light tracking-tight"
            style={{ color: IVORY, fontFamily: "Georgia, serif" }}
          >
            Keto types
          </h1>
          <p className="text-xs" style={{ color: MUTED }}>
            {ketoTypes?.length ?? 0} keto frameworks · curated by category
            {isLocked && " · locked by your coach"}
          </p>
        </div>

        {isLoading && (
          <p style={{ color: MUTED }} className="text-xs">
            Loading…
          </p>
        )}

        {grouped.map((group) => (
          <section key={group.category.id} className="space-y-3">
            <SectionLabel>{group.category.name}</SectionLabel>
            <div className="space-y-3">
              {group.items.map((kt) => {
                const isAssigned = kt.id === assignedKetoId;
                const locked = isLocked && !isAssigned;
                return (
                  <KetoLionCard
                    key={kt.id}
                    abbreviation={kt.abbreviation}
                    name={kt.name}
                    subtitle={kt.subtitle ?? kt.description}
                    fatPct={kt.fat_pct}
                    proteinPct={kt.protein_pct}
                    carbsPct={kt.carbs_pct}
                    locked={locked}
                    isAssigned={isAssigned}
                    onClick={() => navigate(`/client/keto-types/${kt.id}`)}
                  />
                );
              })}
            </div>
          </section>
        ))}

        {!isLoading && grouped.length === 0 && (
          <p style={{ color: MUTED }} className="text-xs">
            No keto types available yet. Your coach will set these up for you.
          </p>
        )}
      </div>
    </div>
  );
}
