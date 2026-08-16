import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import OnboardingShell from "@/components/onboarding/premium/OnboardingShell";
import { useCaptionNarration } from "@/hooks/useCaptionNarration";
import {
  Activity,
  Brain,
  ChevronRight,
  Clock,
  Flame,
  Scale,
  Sparkles,
  Target,
  Utensils,
} from "lucide-react";

const STEP_SCRIPT: Record<number, string> = {
  1: "This is APEXBEAST AI plan mode. Instead of setting every number yourself, you answer a short set of questions and the AI builds your entire fasting system — fuel style, protocol, calories, macros, and your weekly windows. Click Continue to see what it asks.",
  2: "The AI only needs five things: your body stats, your goal, your activity level, your daily rhythm, and any days you can't fast. From those it calculates everything else. Click See a sample plan to continue.",
  3: "Here's an example of what the AI hands back — a named protocol, your eating window, the reasoning behind it, and a start day with a prep runway. Everything stays editable. Click Build my real plan with AI when you're ready.",
};

const INPUT_CARDS = [
  { Icon: Scale, title: "Body stats", desc: "Weight, height, age, and sex set your baseline energy needs.", color: "hsl(var(--primary))" },
  { Icon: Target, title: "Your goal", desc: "Lose fat, recomp, maintain, or perform — this shapes the calorie target.", color: "hsl(174 72% 50%)" },
  { Icon: Activity, title: "Activity level", desc: "Training days and intensity decide how aggressive the fast can be.", color: "hsl(43 65% 52%)" },
  { Icon: Clock, title: "Daily rhythm", desc: "Wake time, work hours, and when you actually like to eat.", color: "hsl(250 65% 68%)" },
];

const SAMPLE_REASONS = [
  "16:8 fits your 6 AM wake-up without forcing you to skip a family dinner.",
  "Balance fuel style keeps carbs around training so strength holds.",
  "Two lighter weekend days give you flexibility without breaking the rhythm.",
];

function StepIntro({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6">
      <div className="relative flex flex-col items-center text-center pt-2">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl border border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary)/0.08)] shadow-2xl">
          <Brain className="h-10 w-10 text-[hsl(var(--primary))]" />
        </div>
        <h2 className="text-3xl font-semibold leading-tight tracking-tight">
          Let APEXBEAST AI build it
        </h2>
        <p className="mt-3 max-w-[17rem] text-base leading-relaxed text-white/70">
          Answer a few questions. The AI designs your fuel style, protocol, calories, macros, and weekly windows in one pass.
        </p>
      </div>

      <div className="mt-2 space-y-3">
        {[
          { Icon: Sparkles, t: "Built around your life", d: "Wake time, training days, and meals you won't give up." },
          { Icon: Utensils, t: "Numbers done for you", d: "Calories and macros calculated, not guessed." },
          { Icon: Flame, t: "Editable, always", d: "Every value the AI picks can be changed later." },
        ].map(({ Icon, t, d }) => (
          <div key={t} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary)/0.15)]">
              <Icon className="h-5 w-5 text-[hsl(var(--primary))]" />
            </div>
            <div className="text-sm">
              <div className="font-semibold text-white">{t}</div>
              <div className="text-white/60">{d}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto pb-2">
        <Button onClick={onNext} size="lg" className="h-14 w-full rounded-2xl text-base font-medium">
          Continue <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function StepInputs({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex h-full flex-col gap-5">
      <div>
        <h2 className="text-2xl font-semibold leading-tight tracking-tight">What the AI asks you</h2>
        <p className="mt-2 text-sm text-white/70">
          Four quick sections. Nothing technical — the AI handles the math.
        </p>
      </div>

      <div className="space-y-3">
        {INPUT_CARDS.map(({ Icon, title, desc, color }, i) => (
          <div
            key={title}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 animate-fade-in"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-25 blur-3xl" style={{ background: color }} />
            <div className="relative flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5">
                <Icon className="h-6 w-6" style={{ color }} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color }}>{title}</div>
                <div className="mt-1 text-sm leading-relaxed text-white/80">{desc}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto pb-2">
        <Button onClick={onNext} size="lg" className="h-14 w-full rounded-2xl text-base font-medium">
          See a sample plan <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function StepSample() {
  const navigate = useNavigate();
  return (
    <div className="flex h-full flex-col gap-5">
      <div>
        <h2 className="text-2xl font-semibold leading-tight tracking-tight">What you get back</h2>
        <p className="mt-2 text-sm text-white/70">Sample only — your real plan uses your answers.</p>
      </div>

      <div className="rounded-2xl border border-[hsl(var(--primary)/0.3)] bg-gradient-to-b from-[hsl(var(--primary)/0.08)] to-transparent p-5">
        <div className="text-2xl font-bold tracking-tight text-white">16:8 Daily Rhythm</div>
        <div className="mt-1 text-sm text-white/70">Balance fuel style · 28-day starter</div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-black/40 p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/50">Break-fast</div>
            <div className="text-lg font-semibold text-white">12:00 PM</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/40 p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/50">Last meal</div>
            <div className="text-lg font-semibold text-white">8:00 PM</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="text-sm font-semibold text-white">Why this plan works for you</div>
        <ul className="mt-3 space-y-2 text-sm text-white/80">
          {SAMPLE_REASONS.map((r) => (
            <li key={r} className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--primary))]" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[["Calories", "2,180"], ["Protein", "185g"], ["Carbs", "180g"]].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-white/10 bg-black/40 p-3 text-center">
            <div className="text-[10px] uppercase tracking-wider text-white/50">{k}</div>
            <div className="text-base font-semibold text-white">{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-auto space-y-3 pb-2">
        <Button
          onClick={() => navigate("/client/onboarding")}
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-medium"
        >
          <Sparkles className="mr-2 h-4 w-4" /> Build my real plan with AI
        </Button>
        <Button
          onClick={() => navigate("/client/plan-builder-demo")}
          variant="outline"
          size="lg"
          className="h-14 w-full rounded-2xl border-white/20 bg-white/5 text-base font-medium hover:bg-white/10 hover:text-white"
        >
          I'd rather build it myself
        </Button>
        <Button
          onClick={() => navigate("/client/dashboard")}
          variant="ghost"
          size="lg"
          className="h-12 w-full rounded-2xl text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white"
        >
          Take me back to Home
        </Button>
      </div>
    </div>
  );
}

export default function AIPlanBuilderDemo() {
  const [step, setStep] = useState(1);
  useCaptionNarration(STEP_SCRIPT[step] ?? "", true);

  return (
    <OnboardingShell step={step} totalSteps={3} onBack={step > 1 ? () => setStep((s) => s - 1) : undefined}>
      <div className="flex min-h-full flex-col">
        <div className="flex min-h-0 flex-1 flex-col">
          {step === 1 && <StepIntro onNext={() => setStep(2)} />}
          {step === 2 && <StepInputs onNext={() => setStep(3)} />}
          {step === 3 && <StepSample />}
        </div>
      </div>
    </OnboardingShell>
  );
}
