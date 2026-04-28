import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Coffee, Droplets, Footprints, Wind, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
  fastStartAt: string | null;
  targetHours: number;
  /** Called when user confirms ending after the reason step. Receives metadata to pass into the end-fast mutation. */
  onConfirmEnd: (meta: {
    reason: string;
    actionAttempted: string | null;
    note: string;
    aiSuggestionShown: boolean;
    aiSuggestionText: string | null;
    elapsedHours: number;
  }) => void;
  /** Called when user picks "No, cancel it" within the just-started window (≤15 min). Should clean-cancel the fast (no log, no penalty). */
  onCancelMistake?: () => void;
  /** Called when user picks "Yes, end & notify trainer" within the just-started window. Ends the fast AND alerts the trainer to reschedule. */
  onEndAndNotifyTrainer?: (meta: { elapsedHours: number }) => void;
}

type Step = "just_started" | "coach" | "reason";

const JUST_STARTED_THRESHOLD_HOURS = 0.25; // 15 minutes

const REASON_OPTIONS: { id: string; label: string }[] = [
  { id: "done", label: "I'm actually done — feel good" },
  { id: "real_hunger", label: "Real hunger / lightheaded" },
  { id: "headache", label: "Headache" },
  { id: "social", label: "Social / scheduling" },
  { id: "food_noise", label: "Food noise / craving" },
  { id: "low_energy", label: "Low energy / weak" },
  { id: "other", label: "Other" },
];

function getStaticDiagnosis(elapsedH: number): { headline: string; suggestions: { id: string; label: string; icon: any; }[] } {
  if (elapsedH < 4) {
    return {
      headline: "This is usually habit hunger, not real hunger — your body is asking for its routine, not fuel.",
      suggestions: [
        { id: "black_coffee", label: "Black coffee or tea", icon: Coffee },
        { id: "sparkling_water", label: "16oz sparkling water", icon: Droplets },
        { id: "walk_5", label: "5-minute walk outside", icon: Footprints },
      ],
    };
  }
  if (elapsedH < 8) {
    return {
      headline: "You're in the glucose dip. It passes in 20–30 minutes if you ride it out with hydration.",
      suggestions: [
        { id: "salt_water", label: "Pinch of salt in water", icon: Droplets },
        { id: "black_coffee", label: "Black coffee", icon: Coffee },
        { id: "breath_478", label: "4-7-8 breathing (2 min)", icon: Wind },
      ],
    };
  }
  if (elapsedH < 12) {
    return {
      headline: "You're past the hardest part. Most cravings here are boredom or environmental triggers, not biology.",
      suggestions: [
        { id: "walk_10", label: "10-minute walk", icon: Footprints },
        { id: "sparkling_water", label: "Sparkling water", icon: Droplets },
        { id: "breath_478", label: "4-7-8 breathing (2 min)", icon: Wind },
      ],
    };
  }
  // 12h+
  return {
    headline: "You've earned the deep benefits — autophagy is active. If hunger is real, end safely; if it's a wave, it'll pass.",
    suggestions: [
      { id: "salt_water", label: "Electrolyte water", icon: Droplets },
      { id: "walk_5", label: "5-minute walk", icon: Footprints },
      { id: "breath_478", label: "4-7-8 breathing (2 min)", icon: Wind },
    ],
  };
}

function getStageLabel(elapsedH: number): string {
  if (elapsedH < 2) return "Anabolic";
  if (elapsedH < 4) return "Catabolic";
  if (elapsedH < 8) return "Post-Absorptive";
  if (elapsedH < 12) return "Gluconeogenesis";
  if (elapsedH < 14) return "Metabolic Shift";
  if (elapsedH < 16) return "Partial Ketosis";
  if (elapsedH < 18) return "Fat Burning";
  if (elapsedH < 24) return "Growth Hormone";
  if (elapsedH < 36) return "Autophagy";
  return "Deep Renewal";
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "night";
}

export function EndFastEarlySheet({
  open,
  onOpenChange,
  clientId,
  fastStartAt,
  targetHours,
  onConfirmEnd,
  onCancelMistake,
  onEndAndNotifyTrainer,
}: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("coach");
  const [aiLine, setAiLine] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [actionAttempted, setActionAttempted] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const elapsedH = useMemo(() => {
    if (!fastStartAt) return 0;
    return Math.max(0, (Date.now() - new Date(fastStartAt).getTime()) / 3_600_000);
  }, [fastStartAt, open]);
  const remainingH = Math.max(0, targetHours - elapsedH);
  const elapsedHrs = Math.floor(elapsedH);
  const elapsedMins = Math.floor((elapsedH - elapsedHrs) * 60);
  const remainHrs = Math.floor(remainingH);
  const remainMins = Math.floor((remainingH - remainHrs) * 60);
  const justStarted = elapsedH < JUST_STARTED_THRESHOLD_HOURS;
  const elapsedTotalMins = Math.max(0, Math.round(elapsedH * 60));

  const diagnosis = useMemo(() => getStaticDiagnosis(elapsedH), [elapsedH]);

  // Reset state and (re)fetch AI line each time the sheet opens.
  // Skip the AI call entirely when the fast just started — it's not useful that early.
  useEffect(() => {
    if (!open) return;
    setStep(justStarted ? "just_started" : "coach");
    setActionAttempted(null);
    setReason(null);
    setNote("");
    setAiLine(null);

    if (justStarted) {
      setAiLoading(false);
      return;
    }

    let cancelled = false;
    const stageLabel = getStageLabel(elapsedH);
    setAiLoading(true);
    supabase.functions
      .invoke("coach-fast-intervention", {
        body: {
          elapsedHours: elapsedH,
          targetHours,
          stageLabel,
          localTimeOfDay: getTimeOfDay(),
        },
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data?.line) {
          setAiLine(data.line as string);
        }
      })
      .catch(() => {
        /* silent — static layer carries the experience */
      })
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSuggestionTap = (suggestionId: string) => {
    setActionAttempted(suggestionId);
    // Route to the relevant in-app flow when meaningful
    onOpenChange(false);
    if (suggestionId === "walk_5" || suggestionId === "walk_10") {
      navigate("/client/cardio");
    } else if (suggestionId === "breath_478") {
      navigate("/client/restore");
    }
    // For water/coffee, just dismiss — user will log manually
  };

  const handleProceedToReason = () => setStep("reason");

  const handleConfirmEnd = () => {
    onConfirmEnd({
      reason: reason ?? "unspecified",
      actionAttempted,
      note: note.trim(),
      aiSuggestionShown: !!aiLine,
      aiSuggestionText: aiLine,
      elapsedHours: Math.round(elapsedH * 100) / 100,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="bg-black border-t p-0 max-h-[92vh] overflow-y-auto"
        style={{ borderColor: "hsl(42 70% 55% / 0.25)" }}
      >
        <div className="px-5 pt-6 pb-8 max-w-md mx-auto space-y-5">
          {step === "just_started" ? (
            <>
              {/* Just-started variant — no coaching, just confirm intent */}
              <div className="space-y-2 text-center">
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
                  style={{ backgroundColor: "hsl(42 70% 55% / 0.12)" }}
                >
                  <AlertCircle className="h-3 w-3" style={{ color: "hsl(42 70% 55%)" }} />
                  <p
                    className="text-[10px] font-medium uppercase tracking-[0.25em]"
                    style={{ color: "hsl(42 70% 55%)" }}
                  >
                    Just started · {elapsedTotalMins} min in
                  </p>
                </div>
                <h2
                  className="text-2xl font-light"
                  style={{ fontFamily: "Georgia, serif", color: "hsl(40 20% 92%)" }}
                >
                  Did you mean to start this fast?
                </h2>
                <p className="text-xs text-white/60 max-w-xs mx-auto leading-relaxed">
                  No worries either way — this won't count against you. Pick whichever fits.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <Button
                  className="w-full h-14 text-sm font-semibold uppercase tracking-widest"
                  style={{
                    backgroundColor: "hsl(42 70% 55%)",
                    color: "hsl(0 0% 8%)",
                  }}
                  onClick={() => {
                    onCancelMistake?.();
                    onOpenChange(false);
                  }}
                >
                  No, cancel it
                </Button>
                <p className="text-[11px] text-white/45 text-center -mt-0.5">
                  Clean slate. Start a fast whenever you're ready.
                </p>

                <Button
                  variant="ghost"
                  className="w-full h-12 text-sm font-medium uppercase tracking-widest border bg-transparent hover:bg-white/[0.03]"
                  style={{
                    borderColor: "hsl(42 70% 55% / 0.4)",
                    color: "hsl(40 20% 92%)",
                  }}
                  onClick={() => {
                    onEndAndNotifyTrainer?.({ elapsedHours: Math.round(elapsedH * 100) / 100 });
                    onOpenChange(false);
                  }}
                >
                  End fast & alert my trainer
                </Button>
                <p className="text-[11px] text-white/45 text-center -mt-0.5">
                  Your trainer will get a heads-up to schedule a new fast.
                </p>
              </div>

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="text-xs text-white/40 hover:text-white/70 underline underline-offset-4 transition-colors"
                >
                  Keep fasting
                </button>
              </div>
            </>
          ) : step === "coach" ? (
            <>
              {/* Header */}
              <div className="space-y-1.5 text-center">
                <p
                  className="text-[10px] font-medium uppercase tracking-[0.3em]"
                  style={{ color: "hsl(42 70% 55%)" }}
                >
                  Pause before you end
                </p>
                <h2
                  className="text-2xl font-light"
                  style={{ fontFamily: "Georgia, serif", color: "hsl(40 20% 92%)" }}
                >
                  You're {elapsedHrs}h {String(elapsedMins).padStart(2, "0")}m in
                </h2>
                <p className="text-xs text-white/60">
                  {remainHrs > 0 || remainMins > 0
                    ? `${remainHrs}h ${String(remainMins).padStart(2, "0")}m left to your ${targetHours}h goal`
                    : "You're at your goal"}
                </p>
              </div>

              {/* Diagnosis (static) */}
              <div
                className="rounded-lg border p-4 space-y-3"
                style={{ borderColor: "hsl(42 70% 55% / 0.25)", backgroundColor: "hsl(42 70% 55% / 0.04)" }}
              >
                <p className="text-sm leading-relaxed text-white/85">
                  {diagnosis.headline}
                </p>

                {/* AI personalized layer (fades in when ready, fails silently) */}
                <div className="min-h-[1.5rem]">
                  {aiLoading && !aiLine ? (
                    <div className="flex items-center gap-2 text-[11px] text-white/40">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Coach is thinking…
                    </div>
                  ) : aiLine ? (
                    <p
                      className="text-[13px] italic leading-snug border-l-2 pl-3 animate-in fade-in duration-500"
                      style={{ color: "hsl(40 20% 88%)", borderColor: "hsl(42 70% 55%)" }}
                    >
                      {aiLine}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Suggestions */}
              <div className="space-y-2">
                <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-white/50 px-1">
                  Try this first
                </p>
                {diagnosis.suggestions.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleSuggestionTap(s.id)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-lg border bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-left"
                      style={{ borderColor: "hsl(42 70% 55% / 0.2)" }}
                    >
                      <Icon className="h-4 w-4 shrink-0" style={{ color: "hsl(42 70% 55%)" }} />
                      <span className="text-sm text-white/90 flex-1">{s.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* End anyway — quieter link */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleProceedToReason}
                  className="text-xs text-white/50 hover:text-white/80 underline underline-offset-4 transition-colors"
                >
                  End fast anyway
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Reason step */}
              <div className="space-y-1.5 text-center">
                <p
                  className="text-[10px] font-medium uppercase tracking-[0.3em]"
                  style={{ color: "hsl(42 70% 55%)" }}
                >
                  One last thing
                </p>
                <h2
                  className="text-2xl font-light"
                  style={{ fontFamily: "Georgia, serif", color: "hsl(40 20% 92%)" }}
                >
                  Why are you ending?
                </h2>
                <p className="text-xs text-white/60">
                  Helps your coach spot patterns and tune your plan.
                </p>
              </div>

              <div className="space-y-2">
                {REASON_OPTIONS.map((r) => {
                  const selected = reason === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setReason(r.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors"
                      style={{
                        borderColor: selected ? "hsl(42 70% 55%)" : "hsl(42 70% 55% / 0.2)",
                        backgroundColor: selected ? "hsl(42 70% 55% / 0.1)" : "transparent",
                        color: selected ? "hsl(40 20% 95%)" : "hsl(40 10% 75%)",
                      }}
                    >
                      <span className="text-sm flex-1">{r.label}</span>
                      {selected && (
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: "hsl(42 70% 55%)" }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-medium uppercase tracking-[0.25em] text-white/50 px-1">
                  Note (optional)
                </label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Anything you want your coach to know…"
                  rows={2}
                  className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-0"
                  maxLength={300}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  variant="ghost"
                  className="h-12 text-sm font-medium uppercase tracking-widest bg-transparent border hover:bg-transparent"
                  style={{ borderColor: "hsl(42 70% 55% / 0.4)", color: "hsl(40 20% 92%)" }}
                  onClick={() => setStep("coach")}
                >
                  Back
                </Button>
                <Button
                  variant="destructive"
                  className="h-12 text-sm font-semibold uppercase tracking-widest"
                  disabled={!reason}
                  onClick={handleConfirmEnd}
                >
                  End fast
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}