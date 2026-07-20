import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Clock, Zap, Activity, Sparkles, ChevronRight, Repeat, Flame, Scale, Dumbbell, X } from "lucide-react";
import InterlockingRings from "../education/InterlockingRings";
import PlateauVsCompound from "../education/PlateauVsCompound";

const PROTOCOLS = [
  { name: "16:8", icon: Clock, effect: "Daily fat adaptation & insulin reset" },
  { name: "18:6", icon: Clock, effect: "Deeper ketosis, sharper focus" },
  { name: "OMAD", icon: Zap, effect: "Maximum autophagy & cellular repair" },
  { name: "ADF", icon: Repeat, effect: "Aggressive fat loss, full reset days" },
  { name: "5:2", icon: Activity, effect: "Sustainable long-term metabolic flex" },
  { name: "Extended", icon: Sparkles, effect: "Deep healing & immune renewal" },
];

const FUEL_STYLES = [
  { name: "Balance", icon: Scale, who: "Sustainable everyday eating — steady energy, no extremes" },
  { name: "Performance", icon: Activity, who: "Carbs timed around training for output and recovery" },
  { name: "Lean", icon: Flame, who: "Aggressive fat loss with a tighter calorie & carb ceiling" },
  { name: "Recomp", icon: Dumbbell, who: "Protein-led fueling to build muscle while losing fat" },
  { name: "Extreme", icon: Zap, who: "Deep metabolic reset — lowest carbs, highest discipline" },
];

const Q_OPTIONS = [
  { id: "wrong", label: "When you eat and how you fuel have to work together — out of sync, you stall.", correct: true },
  { id: "either", label: "It doesn't really matter — fasting alone is enough.", correct: false },
];

export default function SynergyEducationStep({
  onNext,
}: {
  onNext: () => void;
}) {
  const [slide, setSlide] = useState(0);
  const [pickedAnswer, setPickedAnswer] = useState<string | null>(null);

  const advance = () => setSlide((s) => s + 1);

  // Slide 0: The Problem
  if (slide === 0) {
    return (
      <Slide
        eyebrow="The Problem"
        title="Most plans plateau."
        body="Fasting alone works. Fueling right alone works. But most people stall because they're running them out of sync — timing and nutrition fighting each other instead of compounding."
        visual={<InterlockingRings mode="separated" />}
        cta="Continue"
        onCta={advance}
      />
    );
  }

  // Slide 1: The Apex360-IF Principle
  if (slide === 1) {
    return (
      <Slide
        eyebrow="The APEX360 Principle"
        title="FAST + FUEL. One system."
        body="The right Fasting Protocol × the right Fuel Style × your biology. When all three lock in, your metabolism works for you instead of against you."
        visual={<InterlockingRings mode="locked" />}
        cta="Continue"
        onCta={advance}
      />
    );
  }

  // Slide 2: Fasting Protocols
  if (slide === 2) {
    return (
      <SlideShell
        eyebrow="Fasting Protocols"
        title="Six ways to time your fast."
        subtitle="Each protocol triggers a different metabolic effect. Your synergy uses the one matched to your biology."
      >
        <div className="grid grid-cols-1 gap-2">
          {PROTOCOLS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.name}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="rounded-lg bg-[hsl(var(--primary)/0.15)] p-2">
                  <Icon className="h-4 w-4 text-[hsl(var(--primary))]" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{p.name}</div>
                  <div className="text-xs text-white/60">{p.effect}</div>
                </div>
              </div>
            );
          })}
        </div>
        <FooterCta label="Continue" onClick={advance} />
      </SlideShell>
    );
  }

  // Slide 3: Fuel Styles
  if (slide === 3) {
    return (
      <SlideShell
        eyebrow="Fuel Styles"
        title="Five ways to fuel."
        subtitle="Not all eating is the same. The right style depends on activity, goals, and how your body responds."
      >
        <div className="grid grid-cols-1 gap-2">
          {FUEL_STYLES.map((k) => {
            const Icon = k.icon;
            return (
              <div
                key={k.name}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="rounded-lg bg-[hsl(174_72%_50%/0.15)] p-2">
                  <Icon className="h-4 w-4 text-[hsl(174_72%_50%)]" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{k.name}</div>
                  <div className="text-xs text-white/60">{k.who}</div>
                </div>
              </div>
            );
          })}
        </div>
        <FooterCta label="Continue" onClick={advance} />
      </SlideShell>
    );
  }

  // Slide 4: Knowledge Check
  if (slide === 4) {
    const isCorrect = pickedAnswer && Q_OPTIONS.find((o) => o.id === pickedAnswer)?.correct;
    return (
      <SlideShell
        eyebrow="Quick Check"
        title="Why does pairing matter?"
        subtitle="One tap. Locks in the principle."
      >
        <div className="space-y-2">
          {Q_OPTIONS.map((o) => {
            const picked = pickedAnswer === o.id;
            const showResult = pickedAnswer !== null;
            return (
              <button
                key={o.id}
                onClick={() => !showResult && setPickedAnswer(o.id)}
                disabled={showResult}
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                  picked && o.correct
                    ? "border-[hsl(174_72%_50%)] bg-[hsl(174_72%_50%/0.08)]"
                    : picked && !o.correct
                      ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)]"
                      : showResult && o.correct
                        ? "border-[hsl(174_72%_50%/0.5)] bg-[hsl(174_72%_50%/0.04)]"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20"
                }`}
              >
                <div className="mt-0.5">
                  {showResult && o.correct ? (
                    <Check className="h-4 w-4 text-[hsl(174_72%_50%)]" />
                  ) : showResult && picked && !o.correct ? (
                    <X className="h-4 w-4 text-[hsl(var(--primary))]" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-white/30" />
                  )}
                </div>
                <div className="text-sm text-white/90">{o.label}</div>
              </button>
            );
          })}
        </div>
        {pickedAnswer && (
          <div
            className={`rounded-xl border p-3 text-sm animate-fade-in ${
              isCorrect
                ? "border-[hsl(174_72%_50%/0.4)] bg-[hsl(174_72%_50%/0.06)] text-white/90"
                : "border-white/15 bg-white/[0.04] text-white/80"
            }`}
          >
            {isCorrect
              ? "Exactly. FAST + FUEL is what turns two good tools into one compounding system."
              : "Close — but pairing is everything. Fasting alone hits a ceiling. The right Fuel Style breaks through it."}
          </div>
        )}
        <FooterCta label="Continue" onClick={onNext} disabled={!pickedAnswer} />
      </SlideShell>
    );
  }
}

/* ---------- shared layout pieces ---------- */

function SlideShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col gap-4 animate-fade-in">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
          {eyebrow}
        </div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-white/60">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Slide({
  eyebrow,
  title,
  body,
  visual,
  cta,
  onCta,
}: {
  eyebrow: string;
  title: string;
  body: string;
  visual: React.ReactNode;
  cta: string;
  onCta: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-6 animate-fade-in">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
          {eyebrow}
        </div>
        <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-tight">{title}</h2>
      </div>
      <div className="flex justify-center py-2">{visual}</div>
      <p className="text-base leading-relaxed text-white/75">{body}</p>
      <FooterCta label={cta} onClick={onCta} />
    </div>
  );
}

function FooterCta({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-auto pb-2 pt-4">
      <Button
        onClick={onClick}
        disabled={disabled}
        size="lg"
        className="h-14 w-full rounded-2xl text-base font-medium"
      >
        {label} <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}