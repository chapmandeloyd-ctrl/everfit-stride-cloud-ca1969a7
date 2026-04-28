import { supabase } from "@/integrations/supabase/client";

export type EmitEventInput = {
  clientId: string;
  eventType: string;
  title: string;
  subtitle?: string | null;
  category?: "fasting" | "eating" | "workout" | "metrics" | "badges" | "trainer" | "habits" | "general";
  icon?: string | null;
  metadata?: Record<string, any>;
  source?: "client" | "trainer" | "system" | "backfill";
  occurredAt?: Date;
};

/**
 * Append a single event to the activity timeline.
 * Fire-and-forget: errors are logged but never thrown so feature flows aren't blocked.
 */
export async function emitActivityEvent(input: EmitEventInput) {
  try {
    const { error } = await supabase.rpc("emit_activity_event", {
      p_client_id: input.clientId,
      p_event_type: input.eventType,
      p_title: input.title,
      p_subtitle: input.subtitle ?? null,
      p_category: input.category ?? "general",
      p_icon: input.icon ?? null,
      p_metadata: (input.metadata ?? {}) as any,
      p_source: input.source ?? "client",
      p_occurred_at: (input.occurredAt ?? new Date()).toISOString(),
    });
    if (error) console.warn("[activity] emit failed:", error.message);
  } catch (e) {
    console.warn("[activity] emit threw:", e);
  }
}