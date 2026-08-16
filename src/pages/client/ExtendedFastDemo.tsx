import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import OnboardingShell from "@/components/onboarding/premium/OnboardingShell";
import { useCaptionNarration } from "@/hooks/useCaptionNarration";
import { EXTENDED_FAST_PRESETS } from "@/lib/extendedFast";
import {
  ChevronRight,
  Droplets,
  Flame,
  HeartPulse,
  ShieldAlert,
  Timer,
  Utensils,
} from "lucide-react";

const STEP_SCRIPT: Record<number, string> = {
  1: "An extended fast is any fast that runs twenty four hours or longer. It goes past your daily eating window on purpose, so your body drains its stored sugar and spends real time burning fat. Click Continue to see the lengths you can choose.",
  2: "You pick the length. Twenty four hours flips you into deep fat burning. Thirty six adds a full night of repair. Forty eight opens serious autophagy, your cellular clean-up. Seventy two is an elite reset and should only be done with your coach. If you are new, start at twenty four. Click Continue.",
  3: "Every extended fast runs in three phases. Prepare, where you taper carbs and load electrolytes. Fast, the window itself. And Refeed, where you ease back in with small, gentle meals. The refeed matters as much as the fast. Click Continue.",
  4: "Before you start: drink water, salt it, and add electrolytes daily. If you feel dizzy, get heart palpitations, or feel truly unwell, break the fast and eat. You will confirm a short safety acknowledgment when you start. Ready when you are.",
};

function Shell({ title, sub, children, cta, onNext }: {
  title: string; sub: string; children: React.ReactNode; cta: string; onNext: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-5">
      <div>
        <h2 className="text-2xl font-semibold leading-tight tracking-tight">{title}</h2>
        <p className="mt-2 text-sm text-white/70">{sub}</p>
      </div>
      <div className="space-y-3">{children}</div>
      <div className="mt-auto pb-2">
        <Button onClick={onNext} size="lg" className="h-14 w-full rounded-2xl text-base font-medium">
          {cta} <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function Step1({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex flex-col items-center pt-2 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl border border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary)/0.08)] shadow-2xl">
          <Timer className="h-10 w-10 text-[hsl(var(--primary))]" />
        </div>
        <h2 className="text-3xl font-semibold leading-tight tracking-tight">Extended fasting</h2>
        <p className="mt-3 max-w-[18rem] text-base leading-relaxed text-white/70">
          Anything 24 hours or longer. You leave the daily window behind and spend real time in fat-burning.
        </p>
      </div>
      <div className="mt-2 space-y-3">
        {[
          { Icon: Flame, t: "Past the daily window", d: "Glycogen runs out and the body switches fuel sources for hours, not minutes." },
          { Icon: HeartPulse, t: "Deeper repair", d: "Growth hormone climbs and cellular clean-up ramps up the longer you go." },
          { Icon: ShieldAlert, t: "Not an everyday tool", d: "Used as a reset — with prep before and a guided refeed after." },
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

function Step2({ onNext }: { onNext: () => void }) {
  return (
    <Shell
      title="Pick your length"
      sub="Each step up unlocks something different. Start where you are, not where you want to be."
      cta="Continue"
      onNext={onNext}
    >
      {EXTENDED_FAST_PRESETS.map((p, i) => (
        <div
          key={p.id}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 animate-fade-in"
          style={{ animationDelay: `${i * 90}ms` }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="text-lg font-bold text-white">{p.label}</div>
            <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/60">
              {p.level}
            </span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-white/70">{p.description}</p>
          <ul className="mt-2 space-y-1 text-xs text-white/60">
            {p.benefits.slice(0, 2).map((b) => (
              <li key={b} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[hsl(var(--primary))]" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="text-xs leading-relaxed text-white/50">
        New to extended fasting? Start at 24 hours. Anything past 48 hours should be coach-supervised.
      </p>
    </Shell>
  );
}

function Step3({ onNext }: { onNext: () => void }) {
  const phases = [
    { Icon: Utensils, t: "1 · Prepare", d: "Taper carbs, salt your last meal, load electrolytes. A good prep is why hour 18 feels easy.", color: "hsl(43 65% 52%)" },
    { Icon: Timer, t: "2 · Fast", d: "The timer runs the window. Water, black coffee, tea, and electrolytes only.", color: "hsl(var(--primary))" },
    { Icon: Droplets, t: "3 · Refeed", d: "Break gently — broth, protein, something small. Never a huge meal straight out of a long fast.", color: "hsl(174 72% 50%)" },
  ];
  return (
    <Shell
      title="Three phases, every time"
      sub="The app walks you through each one automatically."
      cta="Continue"
      onNext={onNext}
    >
      {phases.map(({ Icon, t, d, color }, i) => (
        <div
          key={t}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 animate-fade-in"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-25 blur-3xl" style={{ background: color }} />
          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5">
              <Icon className="h-6 w-6" style={{ color }} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color }}>{t}</div>
              <div className="mt-1 text-sm leading-relaxed text-white/80">{d}</div>
            </div>
          </div>
        </div>
      ))}
    </Shell>
  );
}

function Step4() {
  const navigate = useNavigate();
  return (
    <div className="flex h-full flex-col gap-5">
      <div>
        <h2 className="text-2xl font-semibold leading-tight tracking-tight">Fast it safely</h2>
        <p className="mt-2 text-sm text-white/70">Read this once — it makes the whole thing easier.</p>
      </div>

      <div className="rounded-2xl border border-[hsl(174_72%_50%/0.3)] bg-[hsl(174_72%_50%/0.06)] p-4">
        <div className="text-sm font-semibold text-white">Do this daily</div>
        <ul className="mt-2 space-y-2 text-sm text-white/80">
          {[
            "Water all day — more than you think you need.",
            "Sodium, potassium, magnesium. Electrolytes are non-negotiable past 24h.",
            "Keep training light. No maxing out mid-fast.",
          ].map((r) => (
            <li key={r} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(174_72%_50%)]" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--primary)/0.07)] p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <ShieldAlert className="h-4 w-4 text-[hsl(var(--primary))]" /> Break the fast if
        </div>
        <ul className="mt-2 space-y-2 text-sm text-white/80">
          {["Dizziness that doesn't pass when you sit down", "Heart racing or palpitations", "You feel genuinely unwell, not just hungry"].map((r) => (
            <li key={r} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--primary))]" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-white/60">
          You'll confirm a short safety acknowledgment before the timer starts.
        </p>
      </div>

      <div className="mt-auto space-y-3 pb-2">
        <Button
          onClick={() => navigate("/client/dashboard?start=extended")}
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-medium"
        >
          <Timer className="mr-2 h-4 w-4" /> Start my extended fast
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

export default function ExtendedFastDemo() {
  const [step, setStep] = useState(1);
  useCaptionNarration(STEP_SCRIPT[step] ?? "", true);

  return (
    <OnboardingShell step={step} totalSteps={4} onBack={step > 1 ? () => setStep((s) => s - 1) : undefined}>
      <div className="flex min-h-full flex-col">
        <div className="flex min-h-0 flex-1 flex-col">
          {step === 1 && <Step1 onNext={() => setStep(2)} />}
          {step === 2 && <Step2 onNext={() => setStep(3)} />}
          {step === 3 && <Step3 onNext={() => setStep(4)} />}
          {step === 4 && <Step4 />}
        </div>
      </div>
    </OnboardingShell>
  );
}
