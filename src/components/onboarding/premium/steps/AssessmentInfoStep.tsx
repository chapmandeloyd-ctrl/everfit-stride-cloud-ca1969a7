import { Button } from "@/components/ui/button";
import { ChevronRight, Sparkles, Target, Calendar, Utensils, Activity } from "lucide-react";
import lionLogo from "@/assets/logo.png";

export default function AssessmentInfoStep({ onNext }: { onNext: () => void }) {
  const bullets = [
    {
      icon: Activity,
      title: "Your Body & Biology",
      desc: "Age, sex, height, weight, and body composition so the plan fits your metabolism.",
    },
    {
      icon: Target,
      title: "Your Goals",
      desc: "Fat loss, performance, longevity, or all three — we optimize for what matters to you.",
    },
    {
      icon: Calendar,
      title: "Your Schedule",
      desc: "Workouts, sleep, work, and life rhythm so fasting works with your day, not against it.",
    },
    {
      icon: Utensils,
      title: "Your Experience",
      desc: "How you've eaten and fasted before so we start at the right level for you.",
    },
  ];

  return (
    <div className="flex h-full flex-col items-center justify-between text-center animate-fade-in overflow-y-auto">
      <div className="flex-1 flex flex-col items-center justify-center gap-5 pt-2">
        <div className="animate-scale-in relative">
          <div className="relative mx-auto h-20 w-20">
            <div
              className="absolute inset-0 rounded-full blur-2xl"
              style={{ background: "hsl(var(--primary) / 0.25)" }}
            />
            <img
              src={lionLogo}
              alt="APEX360-IF"
              className="relative z-10 h-full w-full object-contain"
              style={{ filter: "grayscale(1) brightness(1.4) opacity(0.95)" }}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
            <Sparkles className="h-3 w-3" />
            Your Personalized Assessment
            <Sparkles className="h-3 w-3" />
          </div>
          <h1 className="text-2xl font-semibold leading-tight tracking-tight">
            APEX360 is not one-size-fits-all.
          </h1>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-white/70">
            Over the next few screens, your AI Coach will gather the details that
            most programs ignore. This is why our clients succeed: the plan is
            built around your life, not the other way around.
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
              <div className="space-y-0">
                <div className="text-sm font-medium text-white/90">{b.title}</div>
                <div className="text-xs leading-snug text-white/60">{b.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mx-auto max-w-sm rounded-xl border border-[hsl(174_72%_50%_/0.25)] bg-[hsl(174_72%_50%_/0.08)] p-3 text-xs leading-relaxed text-white/80">
          <span className="font-semibold text-[hsl(174_72%_50%)]">The truth:</span>{" "}
          you still have to show up and do the work. But when your plan is built
          for your lifestyle, discipline stops feeling like punishment and starts
          feeling like momentum. This assessment is what separates APEX360 from
          everything else.
        </div>
      </div>

      <div className="w-full pb-2 pt-4">
        <Button
          onClick={onNext}
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-medium"
        >
          Start My Assessment <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
