import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveClientId } from '@/hooks/useEffectiveClientId';
import { getBrowserTimezone } from '@/lib/healthReminderTimezone';

export type ReminderSettings = {
  enabled: boolean;
  times: string[]; // "HH:MM" 24h
  timezone: string; // IANA tz
};

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: false,
  times: ['08:00', '13:00', '20:00'],
  timezone: 'UTC',
};

function normalize(row: {
  enabled: boolean | null;
  times: string[] | null;
  timezone: string | null;
} | null): ReminderSettings {
  if (!row) {
    return { ...DEFAULT_REMINDER_SETTINGS, timezone: getBrowserTimezone() };
  }
  return {
    enabled: !!row.enabled,
    times: Array.isArray(row.times) && row.times.length > 0 ? row.times : DEFAULT_REMINDER_SETTINGS.times,
    timezone: row.timezone || getBrowserTimezone(),
  };
}

export function reminderSettingsQueryKey(clientId: string | undefined) {
  return ['client_health_reminders', clientId ?? 'none'];
}

/**
 * Loads the reminder configuration for the *effective* client (handles
 * trainer impersonation). When no row exists yet, returns sensible defaults
 * keyed to the device timezone.
 */
export function useHealthReminderSettings() {
  const clientId = useEffectiveClientId();

  return useQuery({
    queryKey: reminderSettingsQueryKey(clientId),
    enabled: !!clientId,
    queryFn: async (): Promise<ReminderSettings> => {
      if (!clientId) return DEFAULT_REMINDER_SETTINGS;
      const { data, error } = await supabase
        .from('client_health_reminders')
        .select('enabled, times, timezone')
        .eq('client_id', clientId)
        .maybeSingle();
      if (error) throw error;
      return normalize(data);
    },
    staleTime: 30_000,
  });
}

/**
 * Saves reminder settings for the effective client. Upserts so the first
 * save creates the row and subsequent saves update it.
 */
export function useSaveHealthReminderSettings() {
  const clientId = useEffectiveClientId();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (next: ReminderSettings) => {
      if (!clientId) throw new Error('No client context');
      const { data: authData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('client_health_reminders')
        .upsert(
          {
            client_id: clientId,
            enabled: next.enabled,
            times: next.times,
            timezone: next.timezone,
            updated_by: authData.user?.id ?? null,
          },
          { onConflict: 'client_id' },
        );
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      qc.setQueryData(reminderSettingsQueryKey(clientId), next);
    },
  });
}