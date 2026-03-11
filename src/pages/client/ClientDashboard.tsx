import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/hooks/useAuth";
import { ClientHeader } from "@/components/client/ClientHeader";
import { CalendarStrip } from "@/components/client/CalendarStrip";
import { RestDayCard } from "@/components/client/RestDayCard";
import { FastingCard } from "@/components/client/FastingCard";
import { EngineStatusMiniCard } from "@/components/client/EngineStatusMiniCard";
import { ActionRow } from "@/components/client/ActionRow";
import { Plus } from "lucide-react";

interface ClientContext {
  profile: Profile;
  onSignOut: () => void;
}

export default function ClientDashboard() {
  const { profile } = useOutletContext<ClientContext>();
  const [settings, setSettings] = useState<any>(null);
  const [restDayCard, setRestDayCard] = useState<any>(null);

  useEffect(() => {
    if (!profile?.id) return;

    const fetchSettings = async () => {
      const { data } = await supabase
        .from("client_feature_settings")
        .select("*")
        .eq("client_id", profile.id)
        .maybeSingle();
      setSettings(data);
    };

    const fetchRestDayCard = async () => {
      const { data } = await supabase
        .from("client_rest_day_cards")
        .select("*")
        .eq("client_id", profile.id)
        .maybeSingle();
      setRestDayCard(data);
    };

    fetchSettings();
    fetchRestDayCard();
  }, [profile?.id]);

  const engineMode = settings?.engine_mode === "athletic"
    ? "Performance Readiness"
    : settings?.engine_mode === "metabolic"
      ? "Metabolic"
      : "Performance Readiness";

  const showFasting = settings?.fasting_enabled !== false && settings?.engine_mode !== "athletic";

  return (
    <div className="px-4 pt-4 pb-6 max-w-lg mx-auto space-y-5">
      <ClientHeader
        profile={profile}
        engineMode={engineMode}
        level={settings?.current_level || 1}
        greeting={settings?.dashboard_hero_message || undefined}
        subtitle={settings?.greeting_subtitle || "Let's do this"}
        emoji={settings?.greeting_emoji || "👋"}
      />

      {/* Action Row */}
      <ActionRow />

      {/* Calendar strip */}
      <CalendarStrip />

      {/* Engine Status */}
      <EngineStatusMiniCard clientId={profile.id} engineMode={engineMode} />

      {/* Today section */}
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
            protocolName="Eat-Stop-Eat"
            isCoachAssigned={true}
            status="ready"
          />
        )}
      </div>

      {/* FAB */}
      <button className="fixed bottom-24 right-5 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 transition-transform active:scale-95">
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}
