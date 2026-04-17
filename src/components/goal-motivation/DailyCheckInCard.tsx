import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, ChevronUp, BookHeart, Check, Loader2, Lock, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useTodayJournal, useSaveJournalEntry } from "@/hooks/useGoalJournal";

const MOODS = [
  { emoji: "🔥", label: "On fire" },
  { emoji: "💪", label: "Strong" },
  { emoji: "😊", label: "Good" },
  { emoji: "😐", label: "Meh" },
  { emoji: "😩", label: "Struggling" },
];

interface Props {
  goalId?: string | null;
  trainerId?: string | null;
  className?: string;
}

export function DailyCheckInCard({ goalId, trainerId, className }: Props) {
  const { toast } = useToast();
  const { data: today, isLoading } = useTodayJournal();
  const save = useSaveJournalEntry();

  const [mood, setMood] = useState<string | null>(null);
  const [level, setLevel] = useState<number>(7);
  const [quickNote, setQuickNote] = useState("");
  const [longNote, setLongNote] = useState("");
  const [showLong, setShowLong] = useState(false);
  const [share, setShare] = useState(false);

  // Hydrate from today's entry once loaded
  useEffect(() => {
    if (today) {
      setMood(today.mood_emoji ?? null);
      setLevel(today.motivation_level ?? 7);
      setQuickNote(today.quick_note ?? "");
      setLongNote(today.long_note ?? "");
      setShowLong(!!today.long_note);
      setShare(today.share_with_coach);
    }
  }, [today]);

  const handleSave = async () => {
    if (!mood) {
      toast({ title: "Pick a mood", description: "Tap how you're feeling today first." });
      return;
    }
    try {
      await save.mutateAsync({
        id: today?.id,
        goal_id: goalId ?? today?.goal_id ?? null,
        trainer_id: trainerId ?? today?.trainer_id ?? null,
        mood_emoji: mood,
        motivation_level: level,
        quick_note: quickNote.trim() || null,
        long_note: longNote.trim() || null,
        share_with_coach: share,
      });
      toast({
        title: today ? "Check-in updated" : "Check-in saved",
        description: share ? "Shared with your coach" : "Kept private",
      });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return <Card className={cn("animate-pulse h-48 bg-muted/30", className)} />;
  }

  const alreadyChecked = !!today;

  return (
    <Card className={cn("border-primary/20", className)}>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookHeart className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold uppercase tracking-wider">
              Daily Check-In
            </span>
          </div>
          {alreadyChecked && (
            <span className="text-[11px] flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Check className="h-3 w-3" /> Done today
            </span>
          )}
        </div>

        {/* Mood */}
        <div className="space-y-2">
          <Label className="text-xs">How are you feeling about your goal?</Label>
          <div className="flex gap-2 justify-between">
            {MOODS.map((m) => (
              <button
                key={m.emoji}
                type="button"
                onClick={() => setMood(m.emoji)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition",
                  mood === m.emoji
                    ? "border-primary bg-primary/10"
                    : "border-transparent hover:bg-muted"
                )}
              >
                <span className="text-2xl">{m.emoji}</span>
                <span className="text-[10px] text-muted-foreground">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Motivation level */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label className="text-xs">Motivation today</Label>
            <span className="text-xs font-bold text-primary">{level}/10</span>
          </div>
          <Slider
            value={[level]}
            min={1}
            max={10}
            step={1}
            onValueChange={(v) => setLevel(v[0])}
          />
        </div>

        {/* Quick note */}
        <div className="space-y-2">
          <Label className="text-xs">One sentence (optional)</Label>
          <Textarea
            placeholder="What's one thing you're proud of today, or one thing you'll do tomorrow?"
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
            rows={2}
            maxLength={200}
          />
        </div>

        {/* Expandable long journal */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowLong((s) => !s)}
            className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline"
          >
            {showLong ? (
              <>
                <ChevronUp className="h-3 w-3" /> Hide long journal
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" /> Add a longer journal entry
              </>
            )}
          </button>
          {showLong && (
            <Textarea
              placeholder="Write whatever's on your mind. Wins, struggles, why you're doing this..."
              value={longNote}
              onChange={(e) => setLongNote(e.target.value)}
              rows={5}
              maxLength={2000}
            />
          )}
        </div>

        {/* Share toggle */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t">
          <div className="flex items-center gap-2 min-w-0">
            {share ? (
              <Share2 className="h-4 w-4 text-primary shrink-0" />
            ) : (
              <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold">
                {share ? "Share with coach" : "Private to you"}
              </p>
              <p className="text-[11px] text-muted-foreground line-clamp-1">
                {share
                  ? "Your coach will see this entry"
                  : "Only you can read this entry"}
              </p>
            </div>
          </div>
          <Switch checked={share} onCheckedChange={setShare} />
        </div>

        <Button onClick={handleSave} disabled={save.isPending} className="w-full">
          {save.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
            </>
          ) : alreadyChecked ? (
            "Update check-in"
          ) : (
            "Save check-in"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
