import { useMemo, useState } from "react";
import { format, isSameDay, isToday, isFuture, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, X, Lock, Share2, BookHeart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useJournalHistory, useTodayJournal, useSaveJournalEntry, type JournalEntry } from "@/hooks/useGoalJournal";

const MOODS = [
  { emoji: "🔥", label: "On fire" },
  { emoji: "💪", label: "Strong" },
  { emoji: "😊", label: "Good" },
  { emoji: "😐", label: "Meh" },
  { emoji: "😩", label: "Struggling" },
];

interface Props {
  goalId?: string | null;
  onClose: () => void;
}

type View = "calendar" | "checkin" | "stamp";

export function SmartPaceJournalView({ goalId, onClose }: Props) {
  const { toast } = useToast();
  const [view, setView] = useState<View>("calendar");
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [month, setMonth] = useState(new Date());

  const { data: history = [] } = useJournalHistory(90);
  const { data: today } = useTodayJournal();
  const save = useSaveJournalEntry();

  // Check-in form state
  const [mood, setMood] = useState<string | null>(null);
  const [level, setLevel] = useState(7);
  const [quickNote, setQuickNote] = useState("");
  const [share, setShare] = useState(false);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, JournalEntry>();
    history.forEach((e) => map.set(e.entry_date, e));
    return map;
  }, [history]);

  const handleDayClick = (date: Date) => {
    if (isFuture(date) && !isToday(date)) {
      toast({ title: "Future day", description: "Come back on this day to check in." });
      return;
    }
    const key = format(date, "yyyy-MM-dd");
    const entry = entriesByDate.get(key);

    if (isToday(date)) {
      // Today: open check-in (or stamp if already done)
      if (entry || today) {
        setSelectedEntry(entry ?? today ?? null);
        setView("stamp");
      } else {
        setMood(null);
        setLevel(7);
        setQuickNote("");
        setShare(false);
        setView("checkin");
      }
      return;
    }

    if (entry) {
      setSelectedEntry(entry);
      setView("stamp");
    } else {
      toast({ title: "No entry", description: format(date, "MMM d") + " — nothing logged that day." });
    }
  };

  const handleSave = async () => {
    if (!mood) {
      toast({ title: "Pick a mood first" });
      return;
    }
    try {
      await save.mutateAsync({
        goal_id: goalId ?? null,
        mood_emoji: mood,
        motivation_level: level,
        quick_note: quickNote.trim() || null,
        long_note: null,
        share_with_coach: share,
      });
      toast({ title: "Check-in saved" });
      setView("calendar");
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
  };

  // ===== Render: Stamp (read-only past entry) =====
  if (view === "stamp" && selectedEntry) {
    return (
      <div className="space-y-3">
        <Header
          title={format(parseISO(selectedEntry.entry_date), "EEEE, MMM d")}
          onBack={() => setView("calendar")}
          onClose={onClose}
        />
        <div className="rounded-xl bg-black/30 ring-1 ring-white/10 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{selectedEntry.mood_emoji ?? "—"}</span>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-white/50">Motivation</p>
              <p className="font-heading font-bold text-xl text-white">
                {selectedEntry.motivation_level ?? "—"}<span className="text-sm text-white/50">/10</span>
              </p>
            </div>
          </div>
          {selectedEntry.quick_note && (
            <p className="text-sm text-white/80 italic border-l-2 border-white/20 pl-3">
              "{selectedEntry.quick_note}"
            </p>
          )}
          {selectedEntry.long_note && (
            <p className="text-xs text-white/60 whitespace-pre-wrap">{selectedEntry.long_note}</p>
          )}
          <div className="flex items-center gap-1.5 text-[11px] text-white/50 pt-1 border-t border-white/10">
            {selectedEntry.share_with_coach ? <Share2 className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            {selectedEntry.share_with_coach ? "Shared with coach" : "Private"}
          </div>
        </div>
      </div>
    );
  }

  // ===== Render: Today's check-in form =====
  if (view === "checkin") {
    return (
      <div className="space-y-3">
        <Header title="Today's check-in" onBack={() => setView("calendar")} onClose={onClose} />

        <div className="space-y-3">
          {/* Mood */}
          <div>
            <Label className="text-[11px] text-white/60">How are you feeling?</Label>
            <div className="flex gap-1.5 mt-1.5">
              {MOODS.map((m) => (
                <button
                  key={m.emoji}
                  type="button"
                  onClick={() => setMood(m.emoji)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg border-2 transition",
                    mood === m.emoji
                      ? "border-white/60 bg-white/10"
                      : "border-transparent bg-black/20 hover:bg-white/5"
                  )}
                >
                  <span className="text-xl">{m.emoji}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Motivation slider */}
          <div>
            <div className="flex justify-between">
              <Label className="text-[11px] text-white/60">Motivation</Label>
              <span className="text-[11px] font-bold text-white">{level}/10</span>
            </div>
            <Slider value={[level]} min={1} max={10} step={1} onValueChange={(v) => setLevel(v[0])} className="mt-2" />
          </div>

          {/* Quick note */}
          <div>
            <Label className="text-[11px] text-white/60">One-liner (optional)</Label>
            <Textarea
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              rows={2}
              maxLength={200}
              placeholder="One win or one focus for tomorrow..."
              className="mt-1 bg-black/30 border-white/10 text-white placeholder:text-white/30 text-sm"
            />
          </div>

          {/* Share */}
          <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
            <div className="flex items-center gap-2">
              {share ? <Share2 className="h-3.5 w-3.5 text-white/70" /> : <Lock className="h-3.5 w-3.5 text-white/70" />}
              <span className="text-xs text-white/80">{share ? "Share with coach" : "Private"}</span>
            </div>
            <Switch checked={share} onCheckedChange={setShare} />
          </div>

          <Button onClick={handleSave} disabled={save.isPending} className="w-full">
            {save.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              "Save check-in"
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ===== Render: Calendar =====
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const leadingBlanks = getDay(monthStart);

  return (
    <div className="space-y-3">
      <Header title="My Journal" onClose={onClose} />

      <div className="rounded-xl bg-black/30 ring-1 ring-white/10 p-3">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setMonth(subMonths(month, 1))} className="p-1 rounded hover:bg-white/10">
            <ChevronLeft className="h-4 w-4 text-white/70" />
          </button>
          <span className="text-sm font-semibold text-white">{format(month, "MMMM yyyy")}</span>
          <button onClick={() => setMonth(addMonths(month, 1))} className="p-1 rounded hover:bg-white/10">
            <ChevronRight className="h-4 w-4 text-white/70" />
          </button>
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="text-center text-[10px] font-semibold text-white/40">{d}</div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {days.map((date) => {
            const key = format(date, "yyyy-MM-dd");
            const entry = entriesByDate.get(key);
            const today = isToday(date);
            const future = isFuture(date) && !today;

            return (
              <button
                key={key}
                onClick={() => handleDayClick(date)}
                disabled={future}
                className={cn(
                  "aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 text-xs transition relative",
                  today && "ring-1 ring-white/60 bg-white/10 font-bold",
                  !today && entry && "bg-white/10 hover:bg-white/15",
                  !today && !entry && !future && "hover:bg-white/5 text-white/70",
                  future && "opacity-30 cursor-not-allowed text-white/40"
                )}
              >
                <span className="text-white">{format(date, "d")}</span>
                {entry?.mood_emoji ? (
                  <span className="text-[10px] leading-none">{entry.mood_emoji}</span>
                ) : entry ? (
                  <span className="h-1 w-1 rounded-full bg-emerald-400" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-white/50 text-center">
        Tap a day to view its entry. Tap today to check in.
      </p>
    </div>
  );
}

function Header({ title, onBack, onClose }: { title: string; onBack?: () => void; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {onBack && (
          <button onClick={onBack} className="p-1 rounded hover:bg-white/10">
            <ChevronLeft className="h-4 w-4 text-white/70" />
          </button>
        )}
        <BookHeart className="h-4 w-4 text-white/70" />
        <span className="text-sm font-bold text-white uppercase tracking-wide">{title}</span>
      </div>
      <button onClick={onClose} className="p-1 rounded hover:bg-white/10">
        <X className="h-4 w-4 text-white/70" />
      </button>
    </div>
  );
}
