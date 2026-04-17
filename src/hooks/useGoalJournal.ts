import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { format } from "date-fns";

export interface JournalEntry {
  id: string;
  client_id: string;
  trainer_id: string | null;
  goal_id: string | null;
  entry_date: string;
  mood_emoji: string | null;
  motivation_level: number | null;
  quick_note: string | null;
  long_note: string | null;
  share_with_coach: boolean;
  created_at: string;
  updated_at: string;
}

const todayStr = () => format(new Date(), "yyyy-MM-dd");

/** Today's journal entry (or null) */
export function useTodayJournal() {
  const clientId = useEffectiveClientId();
  return useQuery({
    queryKey: ["goal-journal-today", clientId, todayStr()],
    enabled: !!clientId,
    queryFn: async (): Promise<JournalEntry | null> => {
      const { data, error } = await supabase
        .from("goal_journal_entries")
        .select("*")
        .eq("client_id", clientId!)
        .eq("entry_date", todayStr())
        .maybeSingle();
      if (error) throw error;
      return data as JournalEntry | null;
    },
  });
}

/** Recent journal history (last N entries) */
export function useJournalHistory(limit = 30) {
  const clientId = useEffectiveClientId();
  return useQuery({
    queryKey: ["goal-journal-history", clientId, limit],
    enabled: !!clientId,
    queryFn: async (): Promise<JournalEntry[]> => {
      const { data, error } = await supabase
        .from("goal_journal_entries")
        .select("*")
        .eq("client_id", clientId!)
        .order("entry_date", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as JournalEntry[];
    },
  });
}

interface SaveJournalInput {
  id?: string;
  goal_id?: string | null;
  trainer_id?: string | null;
  mood_emoji?: string | null;
  motivation_level?: number | null;
  quick_note?: string | null;
  long_note?: string | null;
  share_with_coach: boolean;
}

export function useSaveJournalEntry() {
  const qc = useQueryClient();
  const clientId = useEffectiveClientId();

  return useMutation({
    mutationFn: async (input: SaveJournalInput) => {
      if (!clientId) throw new Error("No client id");

      if (input.id) {
        const { data, error } = await supabase
          .from("goal_journal_entries")
          .update({
            mood_emoji: input.mood_emoji,
            motivation_level: input.motivation_level,
            quick_note: input.quick_note,
            long_note: input.long_note,
            share_with_coach: input.share_with_coach,
          })
          .eq("id", input.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      // Upsert by (client_id, entry_date) unique
      const { data, error } = await supabase
        .from("goal_journal_entries")
        .upsert(
          {
            client_id: clientId,
            trainer_id: input.trainer_id ?? null,
            goal_id: input.goal_id ?? null,
            entry_date: todayStr(),
            mood_emoji: input.mood_emoji ?? null,
            motivation_level: input.motivation_level ?? null,
            quick_note: input.quick_note ?? null,
            long_note: input.long_note ?? null,
            share_with_coach: input.share_with_coach,
          },
          { onConflict: "client_id,entry_date" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goal-journal-today"] });
      qc.invalidateQueries({ queryKey: ["goal-journal-history"] });
    },
  });
}
