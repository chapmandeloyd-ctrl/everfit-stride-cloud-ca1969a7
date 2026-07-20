import { Button } from "@/components/ui/button";
import { Sparkles, Bot, Calendar, MessageSquare, TrendingUp, ChevronRight } from "lucide-react";

const FEATURES = [
  { icon: Bot, title: "Personalized plan", desc: "Built from your body metrics, goals, and fasting experience." },
  { icon: Calendar, title: "Smart scheduling", desc: "Fasting windows adapt to your week, training, and lifestyle." },
  { icon: MessageSquare, title: "Daily accountability", desc: "Check-ins, reminders, and adjustments that keep you on track." },
  { icon: TrendingUp, title: "Real-time optimization", desc: "Your plan evolves as your body and habits change." },
];

export default function CoachingStyleStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex h-full flex-col gap-5">
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--primary))]">
          <Sparkles className="h-3 w-3" /> AI Powered
        </div>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">Meet your AI Coach</h2>
        <p className="mt-1 text-sm text-white/60">
          APEX360 AI designs your entire fasting plan, adapts it as you progress, and keeps you accountable.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="rounded-xl bg-[hsl(var(--primary))/0.15] p-2.5">
                <Icon className="h-5 w-5 text-[hsl(var(--primary))]" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold">{f.title}</div>
                <div className="text-xs text-white/60">{f.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-auto rounded-2xl border border-[hsl(var(--primary))]/20 bg-[hsl(var(--primary))]/5 p-4 text-center">
        <p className="text-sm text-white/80">
          You’re not choosing a coaching style — you’re activating a system that learns your body and guides you every day.
        </p>
      </div>

      <div className="pb-2">
        <Button
          onClick={onNext}
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-medium"
        >
          Continue With AI Coach <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
