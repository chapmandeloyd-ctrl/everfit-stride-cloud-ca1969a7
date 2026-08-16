import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import OnboardingShell from "@/components/onboarding/premium/OnboardingShell";
import { useCaptionNarration } from "@/hooks/useCaptionNarration";
import {
  Apple,
  BatteryCharging,
  CalendarDays,
  ChevronRight,
  CupSoda,
  Droplets,
  Lock,
  NotebookPen,
} from "lucide-react";

const STEP_SCRIPT: Record<number, string> = {
  1: "A juice fast is measured in days, not hours. There is no eating window and no daily timer — the ring counts Day one, Day two, Day three, all the way to the end of your fast. Click Continue.",
  2: "There are two modes. Juice only is strict: fresh juice, water, and nothing solid. Juice plus light snacks allows small additions like broth, fruit, or a handful of nuts, with no full meals. Pick the one you can actually finish. Click Continue.",
  3: "Each day you log how many juices you drank, your water, whether you snacked, and your energy rating. That daily log is what your coach reviews. Your named juices and their calories live in Trainerize — this app tracks the counts and how you felt. Click Continue.",
  4: "You can start one to three days on your own. Four days or more has to be assigned by your trainer. Any fast of three days or longer automatically flags a refeed day at the end so you come out of it properly. Ready when you are.",
};

function Frame({ title, sub, children, cta, onNext }: {
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
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl border border-emerald-500/30 bg-emerald-500/10 shadow-2xl">
          <CupSoda className="h-10 w-10 text-emerald-400" />
        </div>
        <h2 className="text-3xl font-semibold leading-tight tracking-tight">Juice fasting</h2>
        <p className="mt-3 max-w-[18rem] text-base leading-relaxed text-white/70">
          Counted in days, not hours. No eating window — just Day 1, Day 2, Day 3.
        </p>
      </div>

      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-5 text-center">
        <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-300/80">Your hero ring shows</div>
        <div className="mt-1 text-3xl font-bold text-white">Day 2 of 5</div>
        <div className="mt-1 text-xs text-white/60">Day markers ring the circle — one per planned day.</div>
      </div>

      <div className="space-y-3">
        {[
          { Icon: CalendarDays, t: "Day-based, not window-based", d: "It rides extended-fast rails, so no eating window logic gets in the way." },
          { Icon: Droplets, t: "Juice keeps you moving", d: "Enough carbs to stay functional while solid food stays off the table." },
        ].map(({ Icon, t, d }) => (
          <div key={t} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
              <Icon className="h-5 w-5 text-emerald-400" />
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
  const modes = [
    {
      Icon: CupSoda,
      title: "Juice only",
      tag: "Strict",
      desc: "Fresh juice and water. No solid food at all.",
      who: "Best when you want the cleanest reset and you've fasted before.",
      color: "hsl(160 84% 45%)",
    },
    {
      Icon: Apple,
      title: "Juice + light snacks",
      tag: "Flexible",
      desc: "Juice plus small additions — broth, fruit, a handful of nuts. No full meals.",
      who: "Best for longer fasts, busy work weeks, or your first time juicing.",
      color: "hsl(43 65% 52%)",
    },
  ];
  return (
    <Frame
      title="Two modes"
      sub="Pick the one you can finish, not the one that sounds toughest."
      cta="Continue"
      onNext={onNext}
    >
      {modes.map(({ Icon, title, tag, desc, who, color }, i) => (
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
              <div className="flex items-center gap-2">
                <div className="text-base font-bold text-white">{title}</div>
                <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/60">{tag}</span>
              </div>
              <div className="mt-1 text-sm leading-relaxed text-white/80">{desc}</div>
              <div className="mt-2 text-xs text-white/55">{who}</div>
            </div>
          </div>
        </div>
      ))}
    </Frame>
  );
}

function Step3({ onNext }: { onNext: () => void }) {
  return (
    <Frame
      title="Your daily log"
      sub="Thirty seconds a day. This is what your coach reviews."
      cta="Continue"
      onNext={onNext}
    >
      <div className="grid grid-cols-2 gap-3">
        {[["Juices", "4"], ["Water", "96 oz"], ["Snacked", "No"], ["Energy", "7 / 10"]].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-white/10 bg-black/40 p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/50">{k}</div>
            <div className="text-lg font-semibold text-white">{v}</div>
          </div>
        ))}
      </div>

      {[
        { Icon: NotebookPen, t: "Counts, not recipes", d: "Log how many juices — named juices and calories live in Trainerize." },
        { Icon: BatteryCharging, t: "Energy rating matters", d: "It's the fastest signal that a fast needs shortening or a snack added." },
      ].map(({ Icon, t, d }) => (
        <div key={t} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
            <Icon className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="text-sm">
            <div className="font-semibold text-white">{t}</div>
            <div className="text-white/60">{d}</div>
          </div>
        </div>
      ))}
    </Frame>
  );
}

function Step4() {
  const navigate = useNavigate();
  return (
    <div className="flex h-full flex-col gap-5">
      <div>
        <h2 className="text-2xl font-semibold leading-tight tracking-tight">How long, and coming out</h2>
        <p className="mt-2 text-sm text-white/70">Length rules keep this safe — the refeed keeps the results.</p>
      </div>

      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.07] p-4">
        <div className="text-sm font-semibold text-white">1–3 days · start it yourself</div>
        <p className="mt-1 text-sm text-white/70">
          Pick your days and go. Most people start with a 2 or 3 day reset.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Lock className="h-4 w-4 text-white/60" /> 4+ days · trainer assigned
        </div>
        <p className="mt-1 text-sm text-white/70">
          Longer juice fasts have to be assigned by your coach so they can watch your metrics.
        </p>
      </div>

      <div className="rounded-2xl border border-[hsl(43_65%_52%/0.35)] bg-[hsl(43_65%_52%/0.07)] p-4">
        <div className="text-sm font-semibold text-white">Refeed day, automatic</div>
        <p className="mt-1 text-sm text-white/70">
          Any fast of 3 days or longer flags a refeed day at the end — small, gentle meals before you return to normal eating.
        </p>
      </div>

      <div className="mt-auto space-y-3 pb-2">
        <Button
          onClick={() => navigate("/client/dashboard?start=juice")}
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-medium"
        >
          <CupSoda className="mr-2 h-4 w-4" /> Start my juice fast
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

export default function JuiceFastDemo() {
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
