import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, BookOpen, Lock, Image as ImageIcon, Mic } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Props {
  clientId: string;
  trainerId: string;
}

const BUCKET = "goal-motivation-media";

interface Motivation {
  id: string;
  why_text: string | null;
  why_image_url: string | null;
  why_audio_url: string | null;
  updated_at: string;
}

interface JournalEntry {
  id: string;
  entry_date: string;
  mood_emoji: string | null;
  motivation_level: number | null;
  quick_note: string | null;
  long_note: string | null;
  share_with_coach: boolean;
}

function useSignedUrl(path: string | null) {
  return useQuery({
    queryKey: ["motivation-signed-url", path],
    enabled: !!path,
    queryFn: async () => {
      if (!path) return null;
      const { data } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60);
      return data?.signedUrl ?? null;
    },
  });
}

export function CoachMotivationPanel({ clientId }: Props) {
  // Pull most-recent motivation
  const { data: motivation } = useQuery({
    queryKey: ["coach-goal-motivation", clientId],
    queryFn: async (): Promise<Motivation | null> => {
      const { data, error } = await supabase
        .from("goal_motivations")
        .select("id, why_text, why_image_url, why_audio_url, updated_at")
        .eq("client_id", clientId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Motivation | null;
    },
  });

  // Pull only journal entries shared with coach
  const { data: shared } = useQuery({
    queryKey: ["coach-shared-journal", clientId],
    queryFn: async (): Promise<JournalEntry[]> => {
      const { data, error } = await supabase
        .from("goal_journal_entries")
        .select(
          "id, entry_date, mood_emoji, motivation_level, quick_note, long_note, share_with_coach"
        )
        .eq("client_id", clientId)
        .eq("share_with_coach", true)
        .order("entry_date", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as JournalEntry[];
    },
  });

  // Count private (not shared) entries for transparency
  const { data: privateCount } = useQuery({
    queryKey: ["coach-private-journal-count", clientId],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from("goal_journal_entries")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId)
        .eq("share_with_coach", false);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: imageUrl } = useSignedUrl(motivation?.why_image_url ?? null);
  const { data: audioUrl } = useSignedUrl(motivation?.why_audio_url ?? null);

  const hasMotivation =
    motivation && (motivation.why_text || motivation.why_image_url || motivation.why_audio_url);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Heart className="h-4 w-4 text-primary" />
          Motivation & Journal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* My Why */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Personal Why
          </h4>
          {hasMotivation ? (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              {motivation.why_text && (
                <p className="text-sm italic leading-relaxed">"{motivation.why_text}"</p>
              )}
              {imageUrl && (
                <div className="relative overflow-hidden rounded-md border">
                  <img
                    src={imageUrl}
                    alt="Client motivation"
                    className="h-48 w-full object-cover"
                  />
                  <Badge className="absolute top-2 left-2 gap-1" variant="secondary">
                    <ImageIcon className="h-3 w-3" />
                    Image
                  </Badge>
                </div>
              )}
              {audioUrl && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mic className="h-3 w-3" />
                    Voice memo
                  </div>
                  <audio controls src={audioUrl} className="w-full" />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Updated {format(parseISO(motivation.updated_at), "MMM d, yyyy")}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Client hasn't set a personal "why" yet.
            </p>
          )}
        </div>

        {/* Shared journal entries */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Shared Journal
            </h4>
            {(privateCount ?? 0) > 0 && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Lock className="h-3 w-3" />
                {privateCount} private
              </Badge>
            )}
          </div>

          {shared && shared.length > 0 ? (
            <div className="space-y-2">
              {shared.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border bg-card p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {entry.mood_emoji && (
                        <span className="text-2xl">{entry.mood_emoji}</span>
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {format(parseISO(entry.entry_date), "EEE, MMM d")}
                        </p>
                        {entry.motivation_level !== null && (
                          <p className="text-xs text-muted-foreground">
                            Motivation: {entry.motivation_level}/10
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  {entry.quick_note && (
                    <p className="text-sm">{entry.quick_note}</p>
                  )}
                  {entry.long_note && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap border-l-2 border-primary/30 pl-3">
                      {entry.long_note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No shared entries yet. Client controls what they share.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
