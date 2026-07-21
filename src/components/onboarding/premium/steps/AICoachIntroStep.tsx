import { Button } from "@/components/ui/button";
import { ChevronRight, Target, Calendar, Utensils, Activity } from "lucide-react";
import MetabolicRing from "../MetabolicRing";
import lionLogo from "@/assets/logo.png";

export default function AICoachIntroStep({ onNext }: { onNext: () => void }) {
  const bullets = [
    {
      icon: Activity,
      title: "Your Body & Biology",
      desc: "Age, sex, height, weight, and composition — so the plan fits your metabolism.",
    },
    {
      icon: Target,
      title: "Your Goals",
      desc: "Fat loss, performance, longevity — we optimize for what matters to you.",
    },
    {
      icon: Calendar,
      title: "Your Schedule",
      desc: "Workouts, sleep, work — fasting works with your day, not against it.",
    },
    {
      icon: Utensils,
      title: "Your Experience",
      desc: "How you've eaten and fasted before — so we start at the right level.",
    },
  ];

  return (
    <div className="flex h-full flex-col items-center text-center animate-fade-in overflow-y-auto">
      <div className="flex-1 flex flex-col items-center gap-5 pt-2 pb-4 w-full">
        <div className="animate-scale-in relative">
          <MetabolicRing size={160} progress={0} />
          <img
            src={lionLogo}
            alt="Apex360-IF"
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 object-contain"
            style={{ filter: "grayscale(1) brightness(1.4) opacity(0.95)" }}
          />
        </div>
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
            YOUR AI COACH
          </div>
          <h1 className="text-2xl font-semibold leading-tight tracking-tight">
            Your metabolism tells a story.
          </h1>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-white/70">
            APEX360 is not one-size-fits-all. Over the next few screens your AI Coach will gather the details most programs ignore — then design your entire FAST + FUEL program around your life.
          </p>
        </div>

        <div className="w-full max-w-sm space-y-2">
          {bullets.map((b) => (
            <div
              key={b.title}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left backdrop-blur-sm"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[hsl(var(--primary))]">
                <b.icon className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="text-sm font-medium text-white/90">{b.title}</div>
                <div className="text-xs leading-snug text-white/60">{b.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mx-auto max-w-sm rounded-xl border border-[hsl(174_72%_50%_/0.25)] bg-[hsl(174_72%_50%_/0.08)] p-3 text-xs leading-relaxed text-white/80 text-left">
          <span className="font-semibold text-[hsl(174_72%_50%)]">The truth:</span>{" "}
          you still have to show up and do the work. But when your plan is built for your lifestyle, discipline stops feeling like punishment and starts feeling like momentum.
        </div>
      </div>
      <div className="w-full pb-2 pt-4">
        <Button
          onClick={onNext}
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-medium"
        >
          Begin Assessment <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
