import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { CalendarClock, ChevronLeft, Sparkles } from "lucide-react";
import { ClientLayout } from "@/components/ClientLayout";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { DailyPlaybook } from "@/components/playbook/DailyPlaybook";
import { usePlaybookSchedule } from "@/hooks/usePlaybookSchedule";

/**
 * Client-facing Daily Playbook page.
 * Shows today's keto type, active days strip, and the trainer's timed
 * coaching items for the client's currently selected protocol.
 */
export default function ClientPlaybook() {
  const clientId = useEffectiveClientId();
  const navigate = useNavigate();

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["client-playbook-settings", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data } = await supabase
        .from("client_feature_settings")
        .select("selected_protocol_id, protocol_assigned_by")
        .eq("client_id", clientId!)
        .maybeSingle();
      return data;
    },
  });

  const protocolId = settings?.selected_protocol_id ?? null;

  const { data: protocol } = useQuery({
    queryKey: ["client-playbook-protocol", protocolId],
    enabled: !!protocolId,
    queryFn: async () => {
      const { data } = await supabase
        .from("fasting_protocols")
        .select("id, name, fast_hours, eat_hours")
        .eq("id", protocolId!)
        .maybeSingle();
      return data;
    },
  });

  const { data: schedule, isLoading: scheduleLoading } = usePlaybookSchedule(protocolId);

  return (
    <ClientLayout>
      <div className="p-4 space-y-4 pb-24">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Daily Playbook</h1>
          </div>
          <p className="text-muted-foreground">
            Your trainer's day-by-day plan — keto type, timing, and supplements.
          </p>
        </header>

        {settingsLoading ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Loading your playbook…
          </div>
        ) : !protocolId ? (
          <EmptyState
            title="No protocol selected yet"
            body="Pick a fasting protocol to unlock your daily playbook."
            ctaLabel="Choose a protocol"
            onCta={() => navigate("/client/choose-protocol")}
          />
        ) : scheduleLoading ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Loading today's plan…
          </div>
        ) : !schedule ? (
          <EmptyState
            title="Your trainer hasn't built this playbook yet"
            body={
              protocol
                ? `${protocol.name} is assigned, but no daily playbook has been published for it.`
                : "Your protocol is assigned, but no daily playbook has been published yet."
            }
          />
        ) : (
          <>
            {protocol && (
              <div className="rounded-2xl border border-border bg-card px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Active Protocol
                </div>
                <div className="text-lg font-bold">{protocol.name}</div>
                <div className="text-xs text-muted-foreground">
                  {protocol.fast_hours}h fast · {protocol.eat_hours}h eating window
                </div>
              </div>
            )}
            <DailyPlaybook protocolId={protocolId} />
          </>
        )}
      </div>
    </ClientLayout>
  );
}

function EmptyState({
  title,
  body,
  ctaLabel,
  onCta,
}: {
  title: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center space-y-3">
      <Sparkles className="h-6 w-6 mx-auto text-primary" />
      <div className="space-y-1">
        <h3 className="text-base font-bold">{title}</h3>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
      {ctaLabel && onCta && (
        <button
          onClick={onCta}
          className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}