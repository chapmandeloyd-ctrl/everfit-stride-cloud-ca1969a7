import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth, type Profile } from "@/hooks/useAuth";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { ClientHeader } from "@/components/client/ClientHeader";
import { CalendarStrip } from "@/components/client/CalendarStrip";
import { RestDayCard } from "@/components/client/RestDayCard";
import { FastingCard } from "@/components/client/FastingCard";
import { EngineStatusMiniCard } from "@/components/client/EngineStatusMiniCard";
import { ActionRow } from "@/components/client/ActionRow";
import { Plus } from "lucide-react";
import { toast } from "sonner";

type ClientFeatureSettings = Database["public"]["Tables"]["client_feature_settings"]["Row"];
type ClientRestDayCard = Database["public"]["Tables"]["client_rest_day_cards"]["Row"];

export default function ClientDashboard() {
  const { profile: authProfile, loading } = useAuth();
  const effectiveClientId = useEffectiveClientId();
  const [clientProfile, setClientProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [settings, setSettings] = useState<ClientFeatureSettings | null>(null);
  const [restDayCard, setRestDayCard] = useState<ClientRestDayCard | null>(null);

  useEffect(() => {
    let isActive = true;

    const fetchEffectiveProfile = async () => {
      if (!effectiveClientId) {
        if (isActive) {
          setClientProfile(null);
          setProfileLoading(false);
        }
        return;
      }

      setProfileLoading(true);

      if (authProfile?.id === effectiveClientId) {
        if (isActive) {
          setClientProfile(authProfile);
          setProfileLoading(false);
        }
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", effectiveClientId)
        .maybeSingle();

      if (isActive) {
        setClientProfile(data ?? null);
        setProfileLoading(false);
      }
    };

    fetchEffectiveProfile();

    return () => {
      isActive = false;
    };
  }, [effectiveClientId, authProfile]);

  useEffect(() => {
    let isActive = true;

    const fetchDashboardData = async () => {
      if (!effectiveClientId) {
        if (isActive) {
          setSettings(null);
          setRestDayCard(null);
        }
        return;
      }

      const [{ data: settingsData }, { data: restDayCardData }] = await Promise.all([
        supabase
          .from("client_feature_settings")
          .select("*")
          .eq("client_id", effectiveClientId)
          .maybeSingle(),
        supabase
          .from("client_rest_day_cards")
          .select("*")
          .eq("client_id", effectiveClientId)
          .maybeSingle(),
      ]);

      if (isActive) {
        setSettings(settingsData ?? null);
        setRestDayCard(restDayCardData ?? null);
      }
    };

    fetchDashboardData();

    return () => {
      isActive = false;
    };
  }, [effectiveClientId]);

  const engineMode = settings?.engine_mode === "athletic"
    ? "Performance Readiness"
    : settings?.engine_mode === "metabolic"
      ? "Metabolic"
      : "Performance Readiness";

  const showFasting = settings?.fasting_enabled !== false && settings?.engine_mode !== "athletic";
  const fastStatus = settings?.active_fast_start_at ? "active" : "ready";
  const isLoading = loading || profileLoading;

  const handleEndFast = useCallback(async () => {
    if (!effectiveClientId) return;
    const { error } = await supabase
      .from("client_feature_settings")
      .update({
        active_fast_start_at: null,
        active_fast_target_hours: null,
        last_fast_ended_at: new Date().toISOString(),
        eating_window_ends_at: new Date(
          Date.now() + (settings?.eating_window_hours || 8) * 3600 * 1000
        ).toISOString(),
      })
      .eq("client_id", effectiveClientId);
    if (error) {
      toast.error("Failed to end fast");
    } else {
      toast.success("Fast ended!");
      // Refresh settings
      const { data } = await supabase
        .from("client_feature_settings")
        .select("*")
        .eq("client_id", effectiveClientId)
        .maybeSingle();
      if (data) setSettings(data);
    }
  }, [effectiveClientId, settings?.eating_window_hours]);

  const handleStartFast = useCallback(async () => {
    if (!effectiveClientId) return;
    const { error } = await supabase
      .from("client_feature_settings")
      .update({
        active_fast_start_at: new Date().toISOString(),
        active_fast_target_hours: 24,
        last_fast_ended_at: null,
        eating_window_ends_at: null,
      })
      .eq("client_id", effectiveClientId);
    if (error) {
      toast.error("Failed to start fast");
    } else {
      toast.success("Fast started!");
      const { data } = await supabase
        .from("client_feature_settings")
        .select("*")
        .eq("client_id", effectiveClientId)
        .maybeSingle();
      if (data) setSettings(data);
    }
  }, [effectiveClientId]);

  if (isLoading) {
    return (
      <div className="px-4 pt-4 pb-6 max-w-lg mx-auto space-y-5">
        <div className="h-28 rounded-3xl border border-border bg-card animate-pulse" />
        <div className="h-16 rounded-3xl border border-border bg-card animate-pulse" />
        <div className="h-20 rounded-3xl border border-border bg-card animate-pulse" />
        <div className="h-36 rounded-3xl border border-border bg-card animate-pulse" />
      </div>
    );
  }

  if (!effectiveClientId || !clientProfile) {
    return (
      <div className="px-4 pt-8 pb-6 max-w-lg mx-auto">
        <div className="rounded-3xl border border-border bg-card p-5 text-center">
          <p className="text-sm font-medium text-foreground">Client preview unavailable</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We couldn't load the selected client profile yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-6 max-w-lg mx-auto space-y-5">
      <ClientHeader
        profile={clientProfile}
        engineMode={engineMode}
        level={settings?.current_level || 1}
        greeting={settings?.dashboard_hero_message || undefined}
        subtitle={settings?.greeting_subtitle || "Let's do this"}
        emoji={settings?.greeting_emoji || "👋"}
      />

      <ActionRow />
      <CalendarStrip />
      <EngineStatusMiniCard clientId={effectiveClientId} engineMode={engineMode} />

      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Today
        </p>

        <RestDayCard
          imageUrl={restDayCard?.image_url || undefined}
          message={restDayCard?.message || undefined}
        />

        {showFasting && (
          <FastingCard
            protocolName={settings?.fasting_card_subtitle || "Eat-Stop-Eat"}
            isCoachAssigned={!!settings?.protocol_assigned_by}
            status={fastStatus}
            onStartFast={handleStartFast}
            onEndFast={handleEndFast}
            activeFastStartAt={settings?.active_fast_start_at}
            activeFastTargetHours={settings?.active_fast_target_hours}
            backgroundImageUrl={settings?.fasting_card_image_url}
            lockPin={settings?.fast_lock_pin}
          />
        )}
      </div>

      <button className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95">
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}
