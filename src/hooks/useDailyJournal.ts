import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { format } from "date-fns";

export interface DailyJournalEntry {
  id: string;
  client_id: string;
  entry_date: string;
  mood: string | null;
  body_feelings: string[];
  meals_count: string | null;
  snacks_count: number | null;
  meals_quality: string | null;
  note: string | null;
  photo_path: string | null;
  created_at: string;
  updated_at: string;
}

const todayStr = () => format(new Date(), "yyyy-MM-dd");

export function useTodayDailyJournal() {
  const clientId = useEffectiveClientId();
  return useQuery({
    queryKey: ["daily-journal-today", clientId, todayStr()],
    enabled: !!clientId,
    queryFn: async (): Promise<DailyJournalEntry | null> => {
      const { data, error } = await supabase
        .from("daily_journal_entries")
        .select("*")
        .eq("client_id", clientId!)
        .eq("entry_date", todayStr())
        .maybeSingle();
      if (error) throw error;
      return data as DailyJournalEntry | null;
    },
  });
}

export interface SaveDailyJournalInput {
  mood: string | null;
  body_feelings: string[];
  meals_count: string | null;
  snacks_count: number | null;
  meals_quality: string | null;
  note: string | null;
  photo_path?: string | null;
}

export function useSaveDailyJournal() {
  const qc = useQueryClient();
  const clientId = useEffectiveClientId();
  return useMutation({
    mutationFn: async (input: SaveDailyJournalInput) => {
      if (!clientId) throw new Error("No client id");
      const { data, error } = await supabase
        .from("daily_journal_entries")
        .upsert(
          {
            client_id: clientId,
            entry_date: todayStr(),
            mood: input.mood,
            body_feelings: input.body_feelings,
            meals_count: input.meals_count,
            snacks_count: input.snacks_count,
            meals_quality: input.meals_quality,
            note: input.note,
            ...(input.photo_path !== undefined ? { photo_path: input.photo_path } : {}),
          },
          { onConflict: "client_id,entry_date" }
        )
        .select()
        .single();
      if (error) throw error;

      // Emit a single activity event per day (idempotent via category+entry_date in metadata).
      // We delete any prior journal event for today first so edits don't spam the timeline.
      try {
        await supabase
          .from("activity_events")
          .delete()
          .eq("client_id", clientId)
          .eq("event_type", "journal_entry")
          .gte("occurred_at", `${todayStr()}T00:00:00Z`)
          .lt("occurred_at", `${todayStr()}T23:59:59Z`);

        const moodEmojiMap: Record<string, string> = {
          good: "🙂", energized: "⚡", happy: "😄",
          calm: "😌", tired: "😴", stressed: "😖",
        };
        const emoji = input.mood ? moodEmojiMap[input.mood] ?? "📓" : "📓";
        const subtitleParts: string[] = [];
        if (input.meals_count) subtitleParts.push(`${input.meals_count} meals`);
        if (input.snacks_count) subtitleParts.push(`${input.snacks_count} snacks`);
        if (input.meals_quality) subtitleParts.push(input.meals_quality);
        const subtitle = input.note?.trim()
          ? input.note.trim().slice(0, 90)
          : subtitleParts.join(" • ") || null;

        await supabase.rpc("emit_activity_event", {
          p_client_id: clientId,
          p_event_type: "journal_entry",
          p_title: `${emoji} Daily journal`,
          p_subtitle: subtitle,
          p_category: "journal",
          p_icon: "book-open",
          p_metadata: {
            journal_id: (data as any)?.id,
            mood: input.mood,
            body_feelings: input.body_feelings,
            meals_count: input.meals_count,
            snacks_count: input.snacks_count,
            meals_quality: input.meals_quality,
            has_photo: !!input.photo_path,
          },
          p_source: "client",
        });
      } catch (e) {
        console.warn("[daily-journal] failed to emit activity event", e);
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-journal-today"] });
      qc.invalidateQueries({ queryKey: ["daily-journal-history"] });
      qc.invalidateQueries({ queryKey: ["timeline-events"] });
      qc.invalidateQueries({ queryKey: ["activity-events"] });
      qc.invalidateQueries({ queryKey: ["daily-rings"] });
    },
  });
}

/** Get a signed URL for a journal photo (private bucket). */
export async function getJournalPhotoUrl(path: string): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from("daily-journal-photos")
    .createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data?.signedUrl ?? null;
}