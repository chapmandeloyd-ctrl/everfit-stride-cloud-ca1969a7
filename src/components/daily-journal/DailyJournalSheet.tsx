import { useEffect, useRef, useState } from "react";
import { X, Smile, Soup, Apple, Pencil, Image as ImageIcon, Loader2, Check } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import {
  useTodayDailyJournal,
  useSaveDailyJournal,
  getJournalPhotoUrl,
} from "@/hooks/useDailyJournal";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MOODS: { key: string; emoji: string; label: string }[] = [
  { key: "good", emoji: "🙂", label: "Good" },
  { key: "energized", emoji: "⚡", label: "Energized" },
  { key: "happy", emoji: "😄", label: "Happy" },
  { key: "calm", emoji: "😌", label: "Calm" },
  { key: "tired", emoji: "😴", label: "Tired" },
  { key: "stressed", emoji: "😖", label: "Stressed" },
];

const BODY_FEELINGS = [
  "Fine", "Hungry",
  "Headache", "Dizzy",
  "Insomnia", "Nausea",
  "Satiated", "Indigestion",
  "Fatigue", "Weakness",
  "Other",
];

const MEAL_COUNTS = ["1 meal", "2 meals", "3 meals", "4 and more"];
const MEAL_COUNT_VALUES = ["1", "2", "3", "4+"];

const SNACK_COUNTS = [1, 2, 3, 4, 5];

const MEAL_QUALITY: { key: string; emoji: string; label: string }[] = [
  { key: "healthy", emoji: "🥕", label: "Healthy" },
  { key: "unhealthy", emoji: "🍔", label: "Unhealthy" },
  { key: "mixed", emoji: "🍱", label: "Mixed" },
];

export function DailyJournalSheet({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const clientId = useEffectiveClientId();
  const { data: today } = useTodayDailyJournal();
  const save = useSaveDailyJournal();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mood, setMood] = useState<string | null>(null);
  const [body, setBody] = useState<string[]>([]);
  const [mealsCount, setMealsCount] = useState<string | null>(null);
  const [snacks, setSnacks] = useState<number | null>(null);
  const [quality, setQuality] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Hydrate when sheet opens
  useEffect(() => {
    if (!open) return;
    setMood(today?.mood ?? null);
    setBody(today?.body_feelings ?? []);
    setMealsCount(today?.meals_count ?? null);
    setSnacks(today?.snacks_count ?? null);
    setQuality(today?.meals_quality ?? null);
    setNote(today?.note ?? "");
    setPhotoPath(today?.photo_path ?? null);
    if (today?.photo_path) {
      getJournalPhotoUrl(today.photo_path).then(setPhotoUrl);
    } else {
      setPhotoUrl(null);
    }
  }, [open, today]);

  const toggleBody = (item: string) => {
    setBody((prev) =>
      prev.includes(item) ? prev.filter((b) => b !== item) : [...prev, item]
    );
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clientId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${clientId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("daily-journal-photos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      setPhotoPath(path);
      const url = await getJournalPhotoUrl(path);
      setPhotoUrl(url);
      toast({ title: "Photo added" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!mood) {
      toast({ title: "Pick a mood first" });
      return;
    }
    try {
      await save.mutateAsync({
        mood,
        body_feelings: body,
        meals_count: mealsCount,
        snacks_count: snacks,
        meals_quality: quality,
        note: note.trim() || null,
        photo_path: photoPath,
      });
      toast({ title: today ? "Journal updated" : "Journal saved", description: "Shared with your coach" });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[92vh] p-0 bg-background border-t border-white/10 rounded-t-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-background/95 backdrop-blur border-b border-white/10">
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-white/70" />
          </button>
          <h2 className="font-heading font-bold text-white text-lg">Daily Journal</h2>
          <div className="w-8" />
        </div>

        <div className="overflow-y-auto h-[calc(92vh-64px)] pb-32">
          <div className="px-5 pt-5 pb-6 space-y-7">
            {/* Intro */}
            <div>
              <h1 className="font-heading font-bold text-white text-3xl">Daily Journal</h1>
              <p className="text-sm text-white/60 mt-1">Know yourself better for better results.</p>
            </div>

            {/* My mood */}
            <Section icon={<Smile className="h-4 w-4" />} title="My mood">
              <div className="grid grid-cols-4 gap-2.5">
                {MOODS.map((m) => {
                  const selected = mood === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setMood(m.key)}
                      className={cn(
                        "relative flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition",
                        selected
                          ? "border-primary bg-primary/10"
                          : "border-white/10 bg-white/[0.03] hover:bg-white/5"
                      )}
                    >
                      <span className="text-3xl">{m.emoji}</span>
                      <span className={cn("text-[11px]", selected ? "text-white" : "text-white/60")}>
                        {m.label}
                      </span>
                      <SelectDot selected={selected} />
                    </button>
                  );
                })}
              </div>
            </Section>

            <Divider />

            {/* My body */}
            <Section icon={<LotusIcon />} title="My body">
              <div className="grid grid-cols-2 gap-2.5">
                {BODY_FEELINGS.map((b) => {
                  const selected = body.includes(b);
                  const isOther = b === "Other";
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => toggleBody(b)}
                      className={cn(
                        "relative flex items-center justify-between px-4 py-3 rounded-full border-2 transition",
                        isOther && "col-span-2",
                        selected
                          ? "border-primary bg-primary/10 text-white"
                          : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/5"
                      )}
                    >
                      <span className="text-sm font-medium">{b}</span>
                      <SelectDot selected={selected} small />
                    </button>
                  );
                })}
              </div>
            </Section>

            <Divider />

            {/* Today I had */}
            <Section icon={<Soup className="h-4 w-4" />} title="Today I had">
              <div className="grid grid-cols-2 gap-2.5">
                {MEAL_COUNTS.map((label, i) => {
                  const value = MEAL_COUNT_VALUES[i];
                  const selected = mealsCount === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMealsCount(value)}
                      className={cn(
                        "relative flex items-center justify-between px-4 py-3 rounded-full border-2 transition",
                        selected
                          ? "border-primary bg-primary/10 text-white"
                          : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/5"
                      )}
                    >
                      <span className="text-sm font-medium">{label}</span>
                      <SelectDot selected={selected} small />
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Snacks today */}
            <Section icon={<TacoIcon />} title="Snacks today">
              <div className="grid grid-cols-5 gap-2">
                {SNACK_COUNTS.map((n) => {
                  const selected = snacks === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setSnacks(selected ? null : n)}
                      className={cn(
                        "aspect-square rounded-2xl border-2 transition flex items-center justify-center font-heading text-lg font-bold",
                        selected
                          ? "border-primary bg-primary/10 text-white"
                          : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/5"
                      )}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              {/* Track-style indicator */}
              <div className="mt-3 flex items-center gap-1 px-1">
                {SNACK_COUNTS.map((n, i) => (
                  <div key={n} className="flex items-center flex-1">
                    <div
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        snacks && n <= snacks ? "bg-teal-400" : "bg-white/15"
                      )}
                    />
                    {i < SNACK_COUNTS.length - 1 && (
                      <div
                        className={cn(
                          "flex-1 h-0.5",
                          snacks && n < snacks ? "bg-teal-400" : "bg-white/10"
                        )}
                      />
                    )}
                  </div>
                ))}
              </div>
            </Section>

            <Divider />

            {/* My meals were */}
            <Section icon={<Apple className="h-4 w-4" />} title="My meals were">
              <div className="grid grid-cols-3 gap-2.5">
                {MEAL_QUALITY.map((q) => {
                  const selected = quality === q.key;
                  return (
                    <button
                      key={q.key}
                      type="button"
                      onClick={() => setQuality(q.key)}
                      className={cn(
                        "relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition",
                        selected
                          ? "border-primary bg-primary/10"
                          : "border-white/10 bg-white/[0.03] hover:bg-white/5"
                      )}
                    >
                      <span className="text-3xl">{q.emoji}</span>
                      <span className={cn("text-[11px]", selected ? "text-white" : "text-white/60")}>
                        {q.label}
                      </span>
                      <SelectDot selected={selected} />
                    </button>
                  );
                })}
              </div>
            </Section>

            <Divider />

            {/* How was your day */}
            <Section
              icon={<Pencil className="h-4 w-4" />}
              title="How was your day?"
              right={
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="text-xs font-semibold text-teal-400 border border-teal-400/40 rounded-full px-3 py-1.5 flex items-center gap-1.5 hover:bg-teal-400/10 transition disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ImageIcon className="h-3 w-3" />
                  )}
                  {photoPath ? "Change Photo" : "+ Add Photo"}
                </button>
              }
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhoto}
              />
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder={"Was fasting easy today?\nDid you exercise?"}
                className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 text-sm rounded-2xl"
              />
              {photoUrl && (
                <div className="mt-3 relative inline-block">
                  <img
                    src={photoUrl}
                    alt="Journal"
                    className="h-24 w-24 rounded-xl object-cover ring-1 ring-white/10"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoPath(null);
                      setPhotoUrl(null);
                    }}
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-black ring-1 ring-white/20 flex items-center justify-center"
                    aria-label="Remove photo"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              )}
            </Section>
          </div>
        </div>

        {/* Sticky save */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pt-3 pb-6 bg-gradient-to-t from-background via-background to-transparent">
          <Button
            onClick={handleSave}
            disabled={save.isPending || uploading}
            className="w-full h-14 rounded-full text-base font-bold bg-teal-500 hover:bg-teal-400 text-black"
          >
            {save.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({
  icon,
  title,
  right,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-teal-500/15 ring-1 ring-teal-400/30 flex items-center justify-center text-teal-300">
            {icon}
          </div>
          <h3 className="font-heading font-bold text-white text-base">{title}</h3>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Divider() {
  return (
    <div
      className="h-px w-full"
      style={{
        backgroundImage:
          "linear-gradient(to right, rgba(255,255,255,0.12) 50%, transparent 50%)",
        backgroundSize: "8px 1px",
        backgroundRepeat: "repeat-x",
      }}
    />
  );
}

function SelectDot({ selected, small }: { selected: boolean; small?: boolean }) {
  return (
    <span
      className={cn(
        "absolute top-2 right-2 rounded-full flex items-center justify-center transition",
        small ? "h-4 w-4" : "h-5 w-5",
        selected
          ? "bg-primary ring-2 ring-primary/40"
          : "ring-1 ring-white/20 bg-transparent"
      )}
    >
      {selected && <Check className={cn("text-white", small ? "h-2.5 w-2.5" : "h-3 w-3")} />}
    </span>
  );
}

/* Custom inline icons (lucide doesn't ship Lotus/Taco) */
function LotusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M12 14c-4 0-7-3-7-3s3-3 7-3 7 3 7 3-3 3-7 3z" />
      <path d="M12 14c0 3-3 5-3 5s-1-3 0-5" />
      <path d="M12 14c0 3 3 5 3 5s1-3 0-5" />
      <circle cx="12" cy="14" r="1" />
    </svg>
  );
}
function TacoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M3 16c0-5 4-9 9-9s9 4 9 9H3z" />
      <path d="M7 16c1-2 3-3 5-3s4 1 5 3" />
    </svg>
  );
}