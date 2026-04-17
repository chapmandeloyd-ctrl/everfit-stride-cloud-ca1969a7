import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Lock, Share2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useJournalHistory } from "@/hooks/useGoalJournal";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

export function JournalHistory({ className }: Props) {
  const { data: entries, isLoading } = useJournalHistory(30);

  if (isLoading) {
    return <Card className={cn("animate-pulse h-32 bg-muted/30", className)} />;
  }

  // Today's entry (if any) is shown by the check-in card; show the rest here
  const past = (entries ?? []).slice(entries?.[0] && isToday(entries[0].entry_date) ? 1 : 0);

  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold uppercase tracking-wider">Journal History</span>
        </div>

        {past.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No past entries yet. Check in daily to build your story.
          </p>
        ) : (
          <div className="space-y-3">
            {past.map((e) => (
              <div
                key={e.id}
                className="border border-border/50 rounded-lg p-3 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{e.mood_emoji ?? "🙂"}</span>
                    <span className="text-xs font-semibold">
                      {format(parseISO(e.entry_date), "EEE, MMM d")}
                    </span>
                    {e.motivation_level !== null && (
                      <Badge variant="outline" className="text-[10px]">
                        {e.motivation_level}/10
                      </Badge>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    {e.share_with_coach ? (
                      <>
                        <Share2 className="h-2.5 w-2.5" /> Shared
                      </>
                    ) : (
                      <>
                        <Lock className="h-2.5 w-2.5" /> Private
                      </>
                    )}
                  </span>
                </div>
                {e.quick_note && (
                  <p className="text-sm text-foreground">{e.quick_note}</p>
                )}
                {e.long_note && (
                  <p className="text-xs text-muted-foreground whitespace-pre-line">
                    {e.long_note}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function isToday(dateStr: string): boolean {
  return dateStr === format(new Date(), "yyyy-MM-dd");
}
