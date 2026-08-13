import { useEffect, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCaptionNarration } from "@/hooks/useCaptionNarration";
import { ChevronLeft, ChevronRight, Volume2, VolumeX, Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

interface Beat {
  title: string;
  body: string;
  script: string;
  /** index of the demo tile to highlight, or null */
  highlight: number | null;
}

const DEMO_DAYS = [
  { d: 11, dow: "Tue", color: "hsl(142 71% 45%)", label: "16:8" },
  { d: 12, dow: "Wed", color: "hsl(217 91% 60%)", label: "18:6" },
  { d: 13, dow: "Thu", color: "hsl(var(--primary))", label: "20:4" },
  { d: 14, dow: "Fri", color: "hsl(0 84% 55%)", label: "OMAD" },
  { d: 15, dow: "Sat", color: "hsl(48 96% 53%)", label: "Eat all day" },
];

const BEATS: Beat[] = [
  {
    title: "Your week at a glance",
    body: "The strip at the top of your home page shows the days around today. Each tile is one day of your fasting plan, and today is always outlined in red.",
    script:
      "This is your calendar strip. It sits at the top of your home page and shows the days around today. Each tile is one day of your fasting plan, and today is always outlined so you never lose your place.",
    highlight: null,
  },
  {
    title: "The dot is the plan",
    body: "The colored dot under each date tells you the fasting ratio for that day — green 16:8, blue 18:6, red 20:4, deep red OMAD, and gold for an eat all day.",
    script:
      "The colored dot under each date tells you the fasting ratio for that day. Green is sixteen eight, blue is eighteen six, red is twenty four, deep red is one meal a day, and gold means eat all day, no fast.",
    highlight: 2,
  },
  {
    title: "Tap a day to edit it",
    body: "Tap any day to open the day details. From there you can change the ratio, move the start time, or make it a rest day — just for that one day.",
    script:
      "Tap any day to open its details. From there you can change the ratio, move the start time, or make it a rest day. This changes that single day only, nothing else in your plan.",
    highlight: 3,
  },
  {
    title: "Dim days are outside your plan",
    body: "Faded tiles fall outside your active program window, so there is nothing scheduled there yet. Start a plan and they fill in automatically.",
    script:
      "Faded tiles fall outside your active program window, so nothing is scheduled there yet. Once a plan is running, those days fill in automatically.",
    highlight: null,
  },
  {
    title: "Quick tweaks vs. full plan",
    body: "Use the strip for quick one-day changes. When you want to set fuel style, calories, macros, and a repeating weekly pattern, use Build your full plan instead.",
    script:
      "Here is the simple rule. Use the strip for quick one day changes. When you want to set your fuel style, calories, macros, and a repeating weekly pattern, use build your full plan instead. That's your calendar strip in a nutshell.",
    highlight: null,
  },
];

export function CalendarStripTourSheet({ open, onOpenChange }: Props) {
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

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-3xl px-5 pb-6 pt-5">
        <div className="mx-auto w-full max-w-md space-y-5">
          <div className="flex items-center gap-2 pr-8">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-primary">
              Calendar strip tour
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

          {/* Mini demo strip */}
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {DEMO_DAYS.map((day, i) => {
              const lit = beat.highlight === i;
              const dim = step === 3 && i >= 3;
              return (
                <div
                  key={day.d}
                  className={`flex h-[62px] w-[52px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border transition-all ${
                    lit ? "border-primary bg-primary/15 animate-pulse" : "border-border/60 bg-card/40"
                  } ${dim ? "opacity-30" : ""}`}
                >
                  <span className="text-lg font-bold leading-none text-foreground">{day.d}</span>
                  <span className="text-[11px] leading-none text-muted-foreground">{day.dow}</span>
                  <span
                    className="mt-0.5 h-1.5 w-1.5 rounded-full"
                    style={{ background: day.color, boxShadow: lit ? `0 0 6px ${day.color}` : undefined }}
                  />
                </div>
              );
            })}
          </div>

          {step === 1 && (
            <div className="grid grid-cols-2 gap-2">
              {DEMO_DAYS.map((d) => (
                <div key={d.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                  {d.label}
                </div>
              ))}
            </div>
          )}

          <div>
            <h3 className="text-xl font-bold tracking-tight text-foreground">{beat.title}</h3>
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