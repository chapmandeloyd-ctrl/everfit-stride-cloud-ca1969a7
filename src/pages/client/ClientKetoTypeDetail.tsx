import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { toast } from "sonner";
import { ClientLayout } from "@/components/ClientLayout";
import { KetoTypeDetailView } from "@/components/keto/KetoTypeDetailView";
import { PairRequiredDialog } from "@/components/client/PairRequiredDialog";
import {
  ConfirmReplacementDialog,
  CrossSellOtherSideDialog,
} from "@/components/client/ReplacePairDialogs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Brand gold — keto type detail uses gold theming to align with the
// protocol/keto pairing experience (overrides any per-type color from DB).
// Brand signature gold — matches --ring-fasting: hsl(43, 65%, 52%)
const GOLD = "#D9A82E";
const IVORY = "hsl(40 20% 92%)";
const MUTED = "hsl(40 10% 65%)";
const SURFACE = "hsl(0 0% 7%)";
const SURFACE_2 = "hsl(0 0% 10%)";
const GOLD_SOFT = "#B58A1F";

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
  const location = useLocation();
  const clientId = useEffectiveClientId();
  const queryClient = useQueryClient();

  // Pending protocol handoff — when set, the user is mid-flight building
  // their KSOM-360 Synergy program: a new fasting protocol was just chosen
  // and they're here to pick the keto half of the pair.
  const pendingProtocol = (location.state as {
    pendingProtocol?: { type: "quick" | "program"; id: string; name: string };
  } | null)?.pendingProtocol ?? null;

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
        .select("selected_protocol_id, selected_quick_plan_id, active_fast_start_at")
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
  const hasLiveFast = !!featureSettings?.active_fast_start_at;

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
  const [confirmEndFastOpen, setConfirmEndFastOpen] = useState(false);
  const [confirmReplaceOpen, setConfirmReplaceOpen] = useState(false);
  const [crossSellOpen, setCrossSellOpen] = useState(false);
  const [synergyConfirmOpen, setSynergyConfirmOpen] = useState(false);
  const [recapOpen, setRecapOpen] = useState(false);

  // Resolve the currently-active keto type's label so the replacement
  // confirm dialog can show what's being replaced.
  const { data: currentKetoLabel } = useQuery({
    queryKey: ["current-keto-label", activeAssignment?.keto_type_id],
    enabled: !!activeAssignment?.keto_type_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("keto_types")
        .select("abbreviation, name")
        .eq("id", activeAssignment!.keto_type_id)
        .maybeSingle();
      if (!data) return null;
      return `${data.abbreviation} — ${data.name}`;
    },
  });

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
      // If a live fast is running, end it (the user already confirmed in the
      // pre-step) but KEEP their active protocol so the cross-sell can offer
      // the option to change it. Don't nuke the other half of the pair.
      if (hasLiveFast) {
        await supabase
          .from("client_feature_settings")
          .update({
            active_fast_start_at: null,
            active_fast_target_hours: null,
            eating_window_ends_at: null,
            last_fast_ended_at: new Date().toISOString(),
          })
          .eq("client_id", clientId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-keto-assignment"] });
      queryClient.invalidateQueries({ queryKey: ["client-plan-for-synergy", clientId] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings", clientId] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings-fasting", clientId] });
      queryClient.invalidateQueries({ queryKey: ["fasting-gate-state"] });
      queryClient.invalidateQueries({ queryKey: ["fasting-profile-data"] });
      toast.success(`${ketoType?.abbreviation} — ${ketoType?.name} set as your keto type`);
      // Cross-sell only if the user already has the other half of the pair.
      if (hasActivePlan) {
        setCrossSellOpen(true);
      } else {
        setPairDialogOpen(true);
      }
    },
  });

  const handleSetClick = () => {
    // If they're replacing an existing keto type, confirm first.
    if (pendingProtocol) {
      // Pair flow — straight to recap (both sides change).
      setRecapOpen(true);
      return;
    }
    // No-pending flow → open Synergy popup so user can choose: keep current
    // protocol (recap-only) OR browse other protocols.
    setSynergyConfirmOpen(true);
  };

  // After the user confirms replacement, gate on the live-fast flow if needed.
  const handleReplaceConfirmed = () => {
    setConfirmReplaceOpen(false);
    if (hasLiveFast) {
      setConfirmEndFastOpen(true);
    } else {
      setActive.mutate();
    }
  };

  // Paired mutation — when arriving with pendingProtocol, set BOTH the new
  // keto type AND the new fasting protocol in one shot.
  const pairWithProtocolMutation = useMutation({
    mutationFn: async () => {
      if (!clientId || !ketoType) throw new Error("Missing data");
      if (!pendingProtocol) throw new Error("No protocol selected");

      // 1) Swap keto assignment
      if (activeAssignment) {
        await supabase
          .from("client_keto_assignments")
          .update({ is_active: false })
          .eq("id", (activeAssignment as { id: string }).id);
      }
      const { error: ketoErr } = await supabase.from("client_keto_assignments").insert({
        client_id: clientId,
        keto_type_id: ketoType.id,
        assigned_by: clientId,
        is_active: true,
      });
      if (ketoErr) throw ketoErr;

      // 2) Update protocol selection
      const updates: Record<string, unknown> = {};
      if (pendingProtocol.type === "quick") {
        updates.selected_quick_plan_id = pendingProtocol.id;
        updates.selected_protocol_id = null;
        updates.protocol_start_date = null;
      } else {
        updates.selected_protocol_id = pendingProtocol.id;
        updates.selected_quick_plan_id = null;
        updates.protocol_start_date = new Date().toISOString().slice(0, 10);
      }
      // End any live fast since the pair is changing.
      if (hasLiveFast) {
        updates.active_fast_start_at = null;
        updates.active_fast_target_hours = null;
        updates.eating_window_ends_at = null;
        updates.last_fast_ended_at = new Date().toISOString();
      }
      const { error: protocolErr } = await supabase
        .from("client_feature_settings")
        .update(updates)
        .eq("client_id", clientId);
      if (protocolErr) throw protocolErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-keto-assignment"] });
      queryClient.invalidateQueries({ queryKey: ["client-plan-for-synergy", clientId] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings", clientId] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings-fasting", clientId] });
      queryClient.invalidateQueries({ queryKey: ["fasting-detail-feature-settings", clientId] });
      queryClient.invalidateQueries({ queryKey: ["fasting-gate-state"] });
      toast.success("Synergy program saved");
      navigate("/client/complete-plan");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save program"),
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

      {/* Fixed bottom CTA — lifted above the client tab bar so it isn't clipped */}
      <div className="fixed bottom-20 md:bottom-24 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t z-20">
        {isActive ? (
          <div className="space-y-2">
            <div
              className="w-full h-10 rounded-lg flex items-center justify-center text-xs font-bold uppercase tracking-wider"
              style={{
                backgroundColor: `${GOLD}12`,
                color: GOLD,
                border: `1px solid ${GOLD}30`,
              }}
            >
              Your current keto type
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-12 text-sm font-semibold"
                onClick={() => navigate("/client/dashboard")}
              >
                Go back
              </Button>
              <Button
                className="h-12 text-sm font-bold text-white"
                style={{ backgroundColor: GOLD }}
                onClick={() => navigate("/client/keto-types")}
              >
                Browse other keto types
              </Button>
            </div>
          </div>
        ) : (
          <Button
            className="w-full h-14 text-base font-bold text-white"
            style={{ backgroundColor: GOLD }}
            onClick={handleSetClick}
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
        otherLabel={null}
        mode="needs-other"
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

      <ConfirmReplacementDialog
        open={confirmReplaceOpen}
        onOpenChange={setConfirmReplaceOpen}
        kind="keto"
        newLabel={`${ketoType.abbreviation} — ${ketoType.name}`}
        currentLabel={currentKetoLabel ?? null}
        onConfirm={handleReplaceConfirmed}
      />

      <CrossSellOtherSideDialog
        open={crossSellOpen}
        onOpenChange={setCrossSellOpen}
        justChanged="keto"
        newLabel={`${ketoType.abbreviation} — ${ketoType.name}`}
        onChangeOther={() => {
          setCrossSellOpen(false);
          navigate("/client/programs");
        }}
        onViewProgram={() => {
          setCrossSellOpen(false);
          navigate("/client/complete-plan");
        }}
      />

      <AlertDialog open={confirmEndFastOpen} onOpenChange={setConfirmEndFastOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End your active fast?</AlertDialogTitle>
            <AlertDialogDescription>
              You have an active{activePlanName ? ` ${activePlanName}` : ""} fast running. Switching keto types will end it so you can pick a fasting protocol that pairs with{" "}
              <span className="font-semibold text-foreground">{ketoType.abbreviation}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my fast</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmEndFastOpen(false);
                setActive.mutate();
              }}
            >
              End fast & continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ClientLayout>
  );
}
