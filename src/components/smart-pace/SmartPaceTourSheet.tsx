import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { useCaptionNarration } from "@/hooks/useCaptionNarration";
import {
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Sparkles,
  Scale,
  TrendingUp,
  AlertTriangle,
  Target,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Client's base daily pace in lbs — used to scale the worked example. */
  basePaceLbs?: number;
}

interface Beat {
  title: string;
  body: string;
  script: string;
  /** which demo row indexes to spotlight */
  highlight: number[];
}

const BEATS: Beat[] = [
  {
    title: "Your real-pace coach",
    body: "The Smart Weight Tracker turns your goal into one number: exactly how much to lose today. It updates after every weigh-in, so the target is always honest. Click Next to continue.",
    script:
      "This is your Smart Weight Tracker. It takes your goal weight and your target date and turns them into one simple number, exactly how much you need to lose today. It recalculates after every weigh in, so the target is always honest. Click next to continue.",
    highlight: [],
  },
  {
    title: "Weigh in daily",
    body: "Step on the scale, tap Log weigh-in, and enter the number. Scale weight only — no estimates. That single entry drives the whole system. Click Next to continue.",
    script:
      "Every morning you step on the scale, tap log weigh in, and enter the number. Scale weight only, no estimates. That single entry is what drives the whole system. Click next to continue.",
    highlight: [0],
  },
  {
    title: "Beat the target, bank credit",
    body: "Lose more than today's target and the extra becomes credit. Credit lowers tomorrow's target, so a strong day buys you an easy one. Click Next to continue.",
    script:
      "If you lose more than today's target, the extra becomes credit. Credit lowers tomorrow's target, so a strong day literally buys you an easier one. Click next to continue.",
    highlight: [1],
  },
  {
    title: "Miss it, carry debt",
    body: "Come up short — or skip the scale — and the difference becomes debt. Debt is added on top of tomorrow's target, and it's capped so it never becomes unsafe. Click Next to continue.",
    script:
      "If you come up short, or you skip the scale entirely, the difference becomes debt. Debt gets added on top of tomorrow's target. It's capped, so no matter how far behind you fall the daily ask never becomes unsafe. Click next to continue.",
    highlight: [2, 3],
  },
  {
    title: "Catch-up plans, not guilt",
    body: "Fall two days behind and the tracker turns red and offers an AI catch-up plan — a short adjustment to your fasting and food to erase the debt. Click Next to continue.",
    script:
      "Fall two days behind and the tracker turns red and offers you a catch up plan. That's a short, specific adjustment to your fasting and your food designed to erase the debt. It's a plan, not a punishment. Click next to continue.",
    highlight: [3, 4],
  },
  {
    title: "Read the card in 3 seconds",
    body: "Green means on pace, blue means ahead, red means catch up. Tap the card to expand it for your journal, your why, and the full history.",
    script:
      "Here's how to read it. Green means on pace, blue means you're ahead, red means it's time to catch up. Tap the card to expand it and you'll find your journal, your why, and your full weigh in history. That's the Smart Weight Tracker.",
    highlight: [],
  },
];

export function SmartPaceTourSheet({ open, onOpenChange, basePaceLbs = 0.6 }: Props) {
  const [step, setStep] = useState(0);
  const [voiceOn, setVoiceOn] = useState(true);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const beat = BEATS[step];
  const { stop } = useCaptionNarration(open ? beat.script : "", open && voiceOn);

  const close = () => {
    stop();
    onOpenChange(false);
  };

  const base = basePaceLbs > 0 ? basePaceLbs : 0.6;
  const fmt = (n: number) => n.toFixed(1);

  const rows = [
    { day: "Mon", note: "Weighed in", target: base, tone: "neutral" as const },
    { day: "Tue", note: `Beat it · +${fmt(base * 0.5)} credit`, target: base * 0.5, tone: "good" as const },
    { day: "Wed", note: `Short · +${fmt(base * 0.4)} debt`, target: base * 1.4, tone: "bad" as const },
    { day: "Thu", note: "No weigh-in · debt grows", target: base * 2, tone: "bad" as const },
    { day: "Fri", note: "Catch-up plan offered", target: base * 2, tone: "alert" as const },
  ];

  const toneClass = {
    neutral: "text-muted-foreground",
    good: "text-sky-500",
    bad: "text-destructive",
    alert: "text-amber-500",
  };

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-3xl px-5 pb-6 pt-5">
        <VisuallyHidden asChild>
          <SheetTitle>Smart Weight Tracker tour</SheetTitle>
        </VisuallyHidden>
        <div className="mx-auto w-full max-w-md space-y-5">
          <div className="flex items-center gap-2 pr-8">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-primary">
              Smart tracker tour
            </span>
            <button
              onClick={() => {
                if (voiceOn) stop();
                setVoiceOn((v) => !v);
              }}
              className="ml-auto flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-[11px] text-muted-foreground"
            >
              {voiceOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              {voiceOn ? "Voice on" : "Voice off"}
            </button>
          </div>

          {/* Demo week */}
          <div className="space-y-1.5 rounded-2xl border border-border/60 bg-card/40 p-3">
            {rows.map((r, i) => {
              const lit = beat.highlight.includes(i);
              return (
                <div
                  key={r.day}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition-all ${
                    lit ? "border-primary bg-primary/10" : "border-transparent"
                  }`}
                >
                  <span className="w-9 shrink-0 text-xs font-bold uppercase tracking-wide text-foreground">
                    {r.day}
                  </span>
                  <span className={`flex-1 truncate text-[11px] ${toneClass[r.tone]}`}>{r.note}</span>
                  <span className="shrink-0 text-xs font-semibold text-foreground">
                    {fmt(r.target)} lb
                  </span>
                </div>
              );
            })}
          </div>

          {step === 5 && (
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-emerald-500">
                <Target className="h-3.5 w-3.5" /> On pace
              </div>
              <div className="flex items-center gap-1.5 text-sky-500">
                <TrendingUp className="h-3.5 w-3.5" /> Ahead
              </div>
              <div className="flex items-center gap-1.5 text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" /> Catch up
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              <h3 className="text-xl font-bold tracking-tight text-foreground">{beat.title}</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{beat.body}</p>
          </div>

          <div className="flex justify-center gap-1.5">
            {BEATS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/40"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" className="h-12 flex-1 rounded-xl" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
            )}
            {step < BEATS.length - 1 ? (
              <Button className="h-12 flex-1 rounded-xl" onClick={() => setStep((s) => s + 1)}>
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button className="h-12 flex-1 rounded-xl" onClick={close}>
                Got it
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
