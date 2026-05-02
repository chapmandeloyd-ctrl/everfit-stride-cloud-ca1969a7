import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { toast } from "sonner";
import { ClientLayout } from "@/components/ClientLayout";
import { KetoTypeDetailView } from "@/components/keto/KetoTypeDetailView";
import { PairRequiredDialog } from "@/components/client/PairRequiredDialog";

// Brand gold — keto type detail uses gold theming to align with the
// protocol/keto pairing experience (overrides any per-type color from DB).
// Brand signature gold — matches --ring-fasting: hsl(43, 65%, 52%)
const GOLD = "#D9A82E";

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
  engine_compatibility: string;
  how_it_works: string | null;
  built_for: string[];
  coach_notes: string[];
  color: string;
  trainer_id: string;
  category_id: string;
}

export default function ClientKetoTypeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const clientId = useEffectiveClientId();
  const queryClient = useQueryClient();

  const { data: ketoType } = useQuery({
    queryKey: ["keto-type", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("keto_types")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as KetoType;
    },
    enabled: !!id,
  });

  // Realtime: refresh when trainer updates keto macros
  useEffect(() => {
    const channel = supabase
      .channel("keto-detail-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "keto_types" }, () => {
        queryClient.invalidateQueries({ queryKey: ["keto-type"] });
        queryClient.invalidateQueries({ queryKey: ["keto-types-all"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const { data: allTypes } = useQuery({
    queryKey: ["keto-types-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("keto_types")
        .select("id, abbreviation, name, fat_pct, protein_pct, carbs_pct, color")
        .eq("is_active", true)
        .order("order_index");
      if (error) throw error;
      return data;
    },
  });

  const { data: activeAssignment } = useQuery({
    queryKey: ["client-keto-assignment", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from("client_keto_assignments")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Fetch active protocol/quick plan for synergy display
  const { data: featureSettings } = useQuery({
    queryKey: ["client-plan-for-synergy", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_feature_settings")
        .select("selected_protocol_id, selected_quick_plan_id")
        .eq("client_id", clientId!)
        .maybeSingle();
      return data;
    },
    enabled: !!clientId,
  });

  const isActive = activeAssignment?.keto_type_id === id;

  // Resolve the user's currently-active fasting plan name (protocol or quick plan)
  // so the pair dialog can show what this keto type will pair with.
  const activeProtocolId = featureSettings?.selected_protocol_id ?? null;
  const activeQuickPlanId = featureSettings?.selected_quick_plan_id ?? null;
  const hasActivePlan = !!(activeProtocolId || activeQuickPlanId);

  const { data: activePlanName } = useQuery({
    queryKey: ["pair-other-name", activeProtocolId, activeQuickPlanId],
    enabled: hasActivePlan,
    queryFn: async () => {
      if (activeProtocolId) {
        const { data } = await supabase
          .from("fasting_protocols")
          .select("name")
          .eq("id", activeProtocolId)
          .maybeSingle();
        return data?.name ?? null;
      }
      if (activeQuickPlanId) {
        const { data } = await supabase
          .from("quick_fasting_plans")
          .select("name")
          .eq("id", activeQuickPlanId)
          .maybeSingle();
        return (data as { name: string | null } | null)?.name ?? null;
      }
      return null;
    },
  });

  const [pairDialogOpen, setPairDialogOpen] = useState(false);

  const setActive = useMutation({
    mutationFn: async () => {
      if (!clientId || !ketoType) throw new Error("Missing data");
      if (activeAssignment) {
        await supabase
          .from("client_keto_assignments")
          .update({ is_active: false })
          .eq("id", activeAssignment.id);
      }
      await supabase.from("client_keto_assignments").insert({
        client_id: clientId,
        keto_type_id: ketoType.id,
        assigned_by: clientId,
        is_active: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-keto-assignment"] });
      toast.success(`${ketoType?.abbreviation} — ${ketoType?.name} set as your keto type`);
      // Open the pair dialog instead of leaving the user on a dead-end "activated" toast.
      setPairDialogOpen(true);
    },
  });

  if (!ketoType) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </ClientLayout>
    );
  }

  // Force gold theme for the standalone keto type view to match the
  // protocol pairing aesthetic (overrides per-type DB colors).
  const themedKetoType = { ...ketoType, color: GOLD };
  const themedAllTypes = (allTypes || []).map((t) => ({ ...t, color: GOLD }));

  return (
    <ClientLayout>
      <div className="px-3 pt-4 pb-32 space-y-4 w-full">
        {/* Back button */}
        <button
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Keto Types
        </button>

        {/* Shared detail view */}
        <KetoTypeDetailView
          ketoType={themedKetoType}
          allTypes={themedAllTypes}
          isActive={isActive}
        />

      </div>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t z-20">
        {isActive ? (
          <div
            className="w-full h-14 rounded-lg flex items-center justify-center text-base font-bold"
            style={{
              backgroundColor: `${GOLD}12`,
              color: GOLD,
              border: `1px solid ${GOLD}30`,
            }}
          >
            This is your current keto type
          </div>
        ) : (
          <Button
            className="w-full h-14 text-base font-bold text-white"
            style={{ backgroundColor: GOLD }}
            onClick={() => setActive.mutate()}
            disabled={setActive.isPending}
          >
            Set {ketoType.abbreviation} — {ketoType.name}
          </Button>
        )}
        <p className="text-xs text-center text-muted-foreground mt-2">
          This information is educational only and not a substitute for medical advice.
        </p>
      </div>

      <PairRequiredDialog
        open={pairDialogOpen}
        onOpenChange={setPairDialogOpen}
        justSet="keto"
        justSetLabel={`${ketoType.abbreviation} — ${ketoType.name}`}
        otherLabel={activePlanName ?? null}
        mode={hasActivePlan ? "ready-paired" : "needs-other"}
        onPickOther={() => {
          setPairDialogOpen(false);
          navigate("/client/programs");
        }}
        onViewPaired={() => {
          setPairDialogOpen(false);
          navigate("/client/complete-plan");
        }}
        onSaveForLater={() => setPairDialogOpen(false)}
      />
    </ClientLayout>
  );
}
