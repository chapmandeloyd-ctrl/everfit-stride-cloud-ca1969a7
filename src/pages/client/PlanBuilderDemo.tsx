import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import OnboardingShell from "@/components/onboarding/premium/OnboardingShell";
import {
  CalendarDays,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  Scale,
  Sparkles,
  Utensils,
} from "lucide-react";

const DEMO_KEY = "plan_demo_completed";

const FUEL_CARDS = [
  {
    Icon: Flame,
    title: "Fuel Style",
    desc: "Choose your metabolic approach: Balance, Performance, Lean, Recomp, or Extreme. This sets how calories and macros are split across the week.",
    color: "hsl(var(--primary))",
  },
  {
    Icon: Clock,
    title: "Fasting Protocol",
    desc: "Pick how long each fast lasts: 16:8, 18:6, 20:4, OMAD, or extended multi-day fasts. This drives the timer and eating window.",
    color: "hsl(174 72% 50%)",
  },
  {
    Icon: Utensils,
    title: "Macros & Calories",
    desc: "Your daily protein, carbs, fats, and total calories are calculated from your weight, activity level, and chosen goal.",
    color: "hsl(43 65% 52%)",
  },
  {
    Icon: CalendarDays,
    title: "Weekly Schedule",
    desc: "Set a repeating pattern for each day of the week. Different ratios for training days, rest days, and weekends keep the plan flexible.",
    color: "hsl(250 65% 68%)",
  },
];

const SAMPLE_WEEK = [
  { day: "Mon", ratio: "16:8", start: "8:00 PM", eat: "12:00 PM → 8:00 PM" },
  { day: "Tue", ratio: "16:8", start: "8:00 PM", eat: "12:00 PM → 8:00 PM" },
  { day: "Wed", ratio: "18:6", start: "8:00 PM", eat: "2:00 PM → 8:00 PM" },
  { day: "Thu", ratio: "16:8", start: "8:00 PM", eat: "12:00 PM → 8:00 PM" },
  { day: "Fri", ratio: "20:4", start: "6:00 PM", eat: "4:00 PM → 8:00 PM" },
  { day: "Sat", ratio: "OMAD", start: "6:00 PM", eat: "7:00 PM → 8:00 PM" },
  { day: "Sun", ratio: "Eat all day", start: "—", eat: "All day — no fast" },
];

function StepIntro({ onNext }: { onNext: () => void }) {
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="relative flex flex-col items-center text-center pt-2">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/5 shadow-2xl shadow-[hsl(var(--primary))/20]">
          <Sparkles className="h-10 w-10 text-[hsl(var(--primary))]" />
        </div>
        <h2 className="text-3xl font-semibold leading-tight tracking-tight">
          Build your full plan
        </h2>
        <p className="mt-3 max-w-[16rem] text-base leading-relaxed text-white/70">
          The day strip is for quick, one-day tweaks. This is where you design the entire weekly system.
        </p>
      </div>

      <div className="mt-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center gap-3 text-sm text-white/80">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary))/15]">
            <CalendarDays className="h-5 w-5 text-[hsl(var(--primary))]" />
          </div>
          <div>
            <div className="font-semibold text-white">Full Plan Mode</div>
            <div className="text-white/60">Fuel style, calories, macros, fasting windows, and duration.</div>
          </div>
        </div>
      </div>

      <div className="mt-auto pb-2">
        <Button onClick={onNext} size="lg" className="h-14 w-full rounded-2xl text-base font-medium">
          Continue <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      <button
        onClick={() => {
          try { localStorage.setItem(DEMO_KEY, "1"); } catch {}
          navigate("/client/plan-builder?mode=manual");
        }}
        className="absolute right-4 top-1 text-[11px] font-medium uppercase tracking-wider text-white/50 hover:text-white/90"
      >
        Skip demo
      </button>
    </div>
  );
}

function StepOverview({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex h-full flex-col gap-5">
      <div>
        <h2 className="text-2xl font-semibold leading-tight tracking-tight">
          What Full Plan covers
        </h2>
        <p className="mt-2 text-sm text-white/70">
          Four sections that work together so your timer, macros, and calendar stay in sync.
        </p>
      </div>

      <div className="space-y-3">
        {FUEL_CARDS.map(({ Icon, title, desc, color }, i) => (
          <div
            key={title}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl animate-fade-in"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div
              className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-25 blur-3xl"
              style={{ background: color }}
            />
            <div className="relative flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5">
                <Icon className="h-6 w-6" style={{ color }} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color }}>
                  {title}
                </div>
                <div className="mt-1 text-sm leading-relaxed text-white/80">{desc}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto pb-2">
        <Button onClick={onNext} size="lg" className="h-14 w-full rounded-2xl text-base font-medium">
          See how it looks <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function StepWalkthrough({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex h-full flex-col gap-5">
      <div>
        <h2 className="text-2xl font-semibold leading-tight tracking-tight">
          Sample full plan
        </h2>
        <p className="mt-2 text-sm text-white/70">
          A read-only example. Your real numbers will be calculated from your profile.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/50">
            <Scale className="h-4 w-4" /> Weight
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">185 lb</div>
          <div className="mt-1 text-xs text-white/60">Active · Cut (-20%)</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/50">
            <Flame className="h-4 w-4" /> Calories
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">1,980</div>
          <div className="mt-1 text-xs text-white/60">Daily target</div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="text-xs uppercase tracking-wider text-white/50">Daily macros</div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white/5 p-3">
            <div className="text-[10px] uppercase tracking-wider text-blue-300">Protein</div>
            <div className="mt-1 text-lg font-semibold">200g</div>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <div className="text-[10px] uppercase tracking-wider text-green-300">Carbs</div>
            <div className="mt-1 text-lg font-semibold">120g</div>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <div className="text-[10px] uppercase tracking-wider text-yellow-300">Fat</div>
            <div className="mt-1 text-lg font-semibold">65g</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wider text-white/50">
          <span>Weekly schedule</span>
          <span className="text-[10px] normal-case text-white/40">Recurring 12 weeks</span>
        </div>
        <div className="space-y-2">
          {SAMPLE_WEEK.map((row) => (
            <div key={row.day} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-[10px] font-semibold text-white/70">
                  {row.day}
                </div>
                <div className="font-medium text-white">{row.ratio}</div>
              </div>
              <div className="text-xs text-white/60">{row.eat}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto pb-2">
        <Button onClick={onNext} size="lg" className="h-14 w-full rounded-2xl text-base font-medium">
          I&apos;m ready <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function StepStart({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="relative flex flex-col items-center text-center pt-2">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/5">
          <Dumbbell className="h-10 w-10 text-[hsl(174_72%_50%)]" />
        </div>
        <h2 className="text-3xl font-semibold leading-tight tracking-tight">
          Build your full plan
        </h2>
        <p className="mt-3 text-base leading-relaxed text-white/70">
          You can start from scratch manually, or let APEXBEAST AI recommend a full plan after a quick assessment.
        </p>
      </div>

      <div className="mt-2 space-y-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="font-semibold text-white">Manual builder</div>
          <div className="mt-1 text-sm text-white/60">You control every detail: fuel style, calories, macros, and weekly windows.</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="font-semibold text-white">AI-assisted</div>
          <div className="mt-1 text-sm text-white/60">Answer a few questions and the AI fills in a starting plan you can edit.</div>
        </div>
      </div>

      <div className="mt-auto space-y-3 pb-2">
        <Button
          onClick={() => {
            try { localStorage.setItem(DEMO_KEY, "1"); } catch {}
            navigate("/client/plan-builder?mode=manual");
          }}
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-medium"
        >
          Start manual builder
        </Button>
        <Button
          onClick={() => {
            try { localStorage.setItem(DEMO_KEY, "1"); } catch {}
            navigate("/client/onboarding");
          }}
          variant="outline"
          size="lg"
          className="h-14 w-full rounded-2xl border-white/20 bg-white/5 text-base font-medium hover:bg-white/10 hover:text-white"
        >
          <Sparkles className="mr-2 h-4 w-4" /> Use AI instead
        </Button>
      </div>
    </div>
  );
}

export default function PlanBuilderDemo() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  useEffect(() => {
    try {
      if (localStorage.getItem(DEMO_KEY)) {
        navigate("/client/plan-builder?mode=manual", { replace: true });
      }
    } catch {}
  }, [navigate]);

  const totalSteps = 4;

  return (
    <OnboardingShell
      step={step}
      totalSteps={totalSteps}
      onBack={step > 1 ? () => setStep((s) => s - 1) : undefined}
    >
      {step === 1 && <StepIntro onNext={() => setStep(2)} />}
      {step === 2 && <StepOverview onNext={() => setStep(3)} />}
      {step === 3 && <StepWalkthrough onNext={() => setStep(4)} />}
      {step === 4 && <StepStart onBack={() => setStep(3)} />}
    </OnboardingShell>
  );
}
