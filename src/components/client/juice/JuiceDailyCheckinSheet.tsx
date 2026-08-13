import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Check, Minus, Plus } from "lucide-react";
import { juiceProgress, modeMeta, type JuiceDayLog, type JuiceFastSession } from "@/lib/juiceFast";
import { currentJuiceStage, relevantJuiceStages } from "@/lib/juiceStages";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: JuiceFastSession;
  dayNumber: number;
  existing: JuiceDayLog | null;
  loggedDays: number;
  saving?: boolean;
  onSave: (input: {
    dayNumber: number;
    juiceCount: number;
    waterOz: number;
    snacked: boolean;
    snackNote?: string;
    energyRating?: number | null;
    notes?: string;
  }) => void;
}

const ENERGY = [
  { label: "Rough", emoji: "😖", color: "#ef4444" },
  { label: "Low", emoji: "😕", color: "#f97316" },
  { label: "OK", emoji: "😐", color: "#eab308" },
  { label: "Good", emoji: "🙂", color: "#84cc16" },
  { label: "Strong", emoji: "💪", color: "#22c55e" },
];

const FEELINGS = [
  "Clear headed",
  "Hungry",
  "Headache",
  "Light headed",
  "Cold",
  "Calm",
  "Irritable",
  "Energised",
  "Tired",
  "Bloated",
  "Sleeping well",
  "Cravings",
];

const FEEL_TAG = "Feeling: ";

function splitNotes(raw: string | null | undefined) {
  if (!raw) return { feelings: [] as string[], notes: "" };
  const lines = raw.split("\n");
  const tagLine = lines.find((l) => l.startsWith(FEEL_TAG));
  const feelings = tagLine
    ? tagLine
        .slice(FEEL_TAG.length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const notes = lines.filter((l) => l !== tagLine).join("\n").trim();
  return { feelings, notes };
}

/**
 * Guided 3-step daily check-in for an active juice fast:
 * how you feel -> what you took in -> stage progress recap.
 */
export function JuiceDailyCheckinSheet({
  open,
  onOpenChange,
  session,
  dayNumber,
  existing,
  loggedDays,
  saving,
  onSave,
}: Props) {
  const [step, setStep] = useState(0);
  const [energy, setEnergy] = useState<number | null>(null);
  const [feelings, setFeelings] = useState<string[]>([]);
  const [juiceCount, setJuiceCount] = useState(0);
  const [waterOz, setWaterOz] = useState(0);
  const [snacked, setSnacked] = useState(false);
  const [snackNote, setSnackNote] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    const parsed = splitNotes(existing?.notes);
    setStep(0);
    setEnergy(existing?.energy_rating ?? null);
    setFeelings(parsed.feelings);
    setNotes(parsed.notes);
    setJuiceCount(existing?.juice_count ?? 0);
    setWaterOz(existing?.water_oz ?? 0);
    setSnacked(existing?.snacked ?? false);
    setSnackNote(existing?.snack_note ?? "");
  }, [open, existing]);

  const allowsSnacks = session.mode === "juice_plus_light";
  const meta = modeMeta(session.mode);
  const totalHours = session.planned_days * 24;
  const { elapsedHours, pct } = juiceProgress(session);
  const stages = relevantJuiceStages(session.mode, totalHours);
  const stage = currentJuiceStage(session.mode, elapsedHours, totalHours);
  const nextStage = useMemo(() => stages.find((s) => s.hour > elapsedHours) ?? null, [stages, elapsedHours]);
  const hoursToNext = nextStage ? Math.max(0, Math.ceil(nextStage.hour - elapsedHours)) : 0;
  const stageIndex = stages.findIndex((s) => s.hour === stage.hour);

  const composedNotes = () => {
    const parts: string[] = [];
    if (feelings.length) parts.push(`${FEEL_TAG}${feelings.join(", ")}`);
    if (notes.trim()) parts.push(notes.trim());
    return parts.join("\n") || undefined;
  };

  const toggleFeeling = (f: string) =>
    setFeelings((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));

  const save = () =>
    onSave({
      dayNumber,
      juiceCount,
      waterOz,
      snacked,
      snackNote: snackNote || undefined,
      energyRating: energy,
      notes: composedNotes(),
    });

  const stepTitles = ["How do you feel?", "What went in today?", "Your stage progress"];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>
            Day {dayNumber} check-in
          </SheetTitle>
          <SheetDescription>
            {stepTitles[step]} · Step {step + 1} of 3
          </SheetDescription>
        </SheetHeader>

        <div className="mt-3 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn("h-1 flex-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")}
            />
          ))}
        </div>

        <div className="space-y-6 pb-8 pt-5">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Energy right now
                </Label>
                <div className="flex gap-2">
                  {ENERGY.map((e, i) => {
                    const value = i + 1;
                    const active = energy === value;
                    return (
                      <button
                        key={e.label}
                        type="button"
                        onClick={() => setEnergy(active ? null : value)}
                        className={cn(
                          "flex flex-1 flex-col items-center gap-1 rounded-xl border py-2.5 transition",
                          active ? "border-primary bg-primary/15" : "border-border bg-card",
                        )}
                      >
                        <span className="text-lg">{e.emoji}</span>
                        <span
                          className={cn(
                            "text-[10px] font-semibold",
                            active ? "text-primary" : "text-muted-foreground",
                          )}
                        >
                          {e.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Anything you're noticing?
                </Label>
                <div className="flex flex-wrap gap-2">
                  {FEELINGS.map((f) => {
                    const active = feelings.includes(f);
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => toggleFeeling(f)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
                          active
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border bg-card text-muted-foreground",
                        )}
                      >
                        {f}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes for your coach (optional)"
                rows={3}
              />
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Juices today
                </Label>
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="icon" onClick={() => setJuiceCount((c) => Math.max(0, c - 1))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[3ch] text-center text-3xl font-bold tabular-nums">{juiceCount}</span>
                  <Button variant="outline" size="icon" onClick={() => setJuiceCount((c) => Math.min(20, c + 1))}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Named juices and their calories stay in Trainerize — this is just your daily count.
                </p>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="juice-checkin-water"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Water (oz)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="juice-checkin-water"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={waterOz}
                    onChange={(e) => setWaterOz(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="h-10 w-24"
                  />
                  {[8, 16, 32].map((n) => (
                    <Button key={n} variant="outline" size="sm" onClick={() => setWaterOz((w) => w + n)}>
                      +{n}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{allowsSnacks ? "Had a snack today" : "Ate solid food"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {allowsSnacks
                        ? "Small snacks are part of this style — just log them."
                        : "This is a juice-only fast. Log it honestly so your coach sees the real picture."}
                    </p>
                  </div>
                  <Switch checked={snacked} onCheckedChange={setSnacked} />
                </div>
                {snacked && (
                  <Input
                    value={snackNote}
                    onChange={(e) => setSnackNote(e.target.value)}
                    placeholder="What did you have?"
                    className="h-9"
                  />
                )}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div
                className="rounded-2xl border p-4"
                style={{ borderColor: `${stage.color}55`, backgroundColor: `${stage.color}12` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full text-xl"
                    style={{ backgroundColor: `${stage.color}22`, boxShadow: `0 0 0 2px ${stage.color}55` }}
                  >
                    {stage.icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: stage.color }}>
                      {stage.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Stage {stageIndex + 1} of {stages.length} · {stage.description}
                    </p>
                  </div>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {stage.benefits.slice(0, 3).map((b, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <p className="text-[12px] leading-relaxed text-foreground/85">{b}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>Fast progress</span>
                  <span>{Math.round(pct * 100)}%</span>
                </div>
                <Progress value={pct * 100} className="h-2" />
                <p className="text-[11px] text-muted-foreground">
                  {nextStage
                    ? `${hoursToNext}h to ${nextStage.label} ${nextStage.icon}`
                    : "Final stage — ride it out to the finish."}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Day", value: `${dayNumber}/${session.planned_days}` },
                  { label: "Days logged", value: `${loggedDays + (existing ? 0 : 1)}` },
                  { label: "Style", value: meta.short },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-border bg-card p-2.5 text-center">
                    <p className="text-base font-bold tabular-nums">{s.value}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back
              </Button>
            )}
            {step < 2 ? (
              <Button size="lg" className="flex-1" onClick={() => setStep((s) => s + 1)}>
                Next
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <Button size="lg" className="flex-1" disabled={saving} onClick={save}>
                <Check className="mr-1.5 h-4 w-4" />
                {saving ? "Saving…" : "Finish check-in"}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}