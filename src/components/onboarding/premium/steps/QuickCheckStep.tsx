import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, Clock, Flame, Scale, Moon, CheckCircle2, Sparkles, ChevronUp } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

const PILLARS = [
  {
    id: "fast",
    icon: Clock,
    title: "FAST",
    tagline: "Train your metabolism to burn fat first.",
    benefit: "A structured eating window that gives your body time to tap into stored energy.",
    hsl: "0 0% 100%",
    headline: "Fasting flips the metabolic switch.",
    body:
      "A structured eating window lowers insulin, empties liver glycogen, and forces your body to tap into stored fat for fuel. This is where fat loss actually happens — not from eating less, but from letting the body reach for what it already has.",
    bullets: [
      "Lower insulin → unlock stored fat",
      "Deeper fat oxidation between meals",
      "Cellular clean-up (autophagy) after 14–16h",
      "Sharper focus and stable energy",
    ],
  },
  {
    id: "fuel",
    icon: Flame,
    title: "FUEL",
    tagline: "Eat with purpose, not just restriction.",
    benefit: "A fuel style that matches your goals — performance, lean, recomp, or extreme.",
    hsl: "174 72% 50%",
    headline: "The food inside your window decides the result.",
    body:
      "Fasting alone is not enough. Your Fuel Style — Balance, Performance, Lean, Recomp, or Extreme — is matched to your body, activity, and goal so every meal moves you forward instead of pulling you back.",
    bullets: [
      "Protein-first to protect lean muscle",
      "Carbs timed around activity",
      "Fats calibrated to your fuel style",
      "Real food, real portions, no gimmicks",
    ],
  },
  {
    id: "track",
    icon: Scale,
    title: "TRACK",
    tagline: "Real accountability, every morning.",
    benefit: "Your Smart Weight Tracker adjusts your daily target after every weigh-in.",
    hsl: "0 78% 45%",
    headline: "The Smart Weight Tracker keeps you honest.",
    body:
      "Every morning weigh-in recalculates your exact daily target. Fall behind and you'll see the precise catch-up. Ahead of pace and you bank credit for tougher days. No hiding, no guessing — just a real-pace coach in your pocket.",
    bullets: [
      "Daily target that adapts to reality",
      "Debt & credit system, not weekly guesses",
      "AI catch-up plans when you drift",
      "The one feature no other app offers",
    ],
  },
  {
    id: "restore",
    icon: Moon,
    title: "RESTORE",
    tagline: "Recover so the system compounds.",
    benefit: "Sleep, stress, and nervous-system recovery — the multiplier most plans ignore.",
    hsl: "250 65% 68%",
    headline: "Recovery is the multiplier most plans ignore.",
    body:
      "Poor sleep spikes hunger hormones and stalls fat loss no matter how clean you eat. RESTORE brings sleep, stress, and nervous-system recovery into the plan so the other three pillars actually compound instead of leak.",
    bullets: [
      "Better sleep = lower cortisol & cravings",
      "Nervous-system down-regulation tools",
      "Guided breathwork and wind-downs",
      "Protects the results FAST + FUEL create",
    ],
  },
];

export default function QuickCheckStep({ onNext }: { onNext: () => void }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const active = PILLARS.find((p) => p.id === openId) ?? null;
  const ActiveIcon = active?.icon;

  const c = (hsl: string, a = 1) => `hsl(${hsl} / ${a})`;

  return (
    <div className="flex h-full flex-col gap-5 animate-fade-in">
      <div className="text-center">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
          The Complete System
        </div>
        <h2 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight">
          Four levers. One result.
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/70">
          APEX360-IF is not a diet. It is a system that works because each part reinforces the other.
        </p>
      </div>

      <div className="space-y-3">
        {PILLARS.map((p) => {
          const Icon = p.icon;
          const color = c(p.hsl);
          const border = c(p.hsl, 0.28);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setOpenId(p.id)}
              className="group relative w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left backdrop-blur-sm transition hover:bg-white/[0.05] active:scale-[0.99]"
              style={{ borderColor: border }}
            >
              <div
                className="absolute right-0 top-0 h-24 w-24 -translate-y-1/2 translate-x-1/2 rounded-full opacity-10 blur-2xl"
                style={{ background: color }}
              />
              <div className="relative flex items-start gap-4">
                <div
                  className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border"
                  style={{
                    borderColor: border,
                    background: `radial-gradient(circle at 50% 50%, ${c(p.hsl, 0.32)} 0%, ${c(p.hsl, 0.08)} 70%, transparent 100%)`,
                    boxShadow: `0 0 26px -6px ${c(p.hsl, 0.6)}, inset 0 0 14px ${c(p.hsl, 0.18)}`,
                    color,
                  }}
                >
                  <Icon className="h-6 w-6 drop-shadow-[0_0_8px_currentColor]" strokeWidth={2.25} />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tracking-wide" style={{ color }}>
                      {p.title}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-white/95">{p.tagline}</div>
                  <div className="text-xs leading-relaxed text-white/60">{p.benefit}</div>
                  <div className="flex items-center gap-1 pt-1 text-[10px] font-medium uppercase tracking-wider text-white/40 group-hover:text-white/70">
                    Tap to learn more <ChevronUp className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => setAcknowledged((a) => !a)}
        className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${
          acknowledged
            ? "border-[hsl(174_72%_50%)] bg-[hsl(174_72%_50%_/0.08)]"
            : "border-white/10 bg-white/[0.03] hover:border-white/20"
        }`}
      >
        <div className="space-y-1">
          <div className="text-sm font-semibold text-white/90">I understand the system.</div>
          <div className="text-xs leading-relaxed text-white/60">
            Fasting + Fuel + Smart Tracking + Restore is the APEX360 edge. No other app connects all four.
          </div>
        </div>
        <div
          className={`ml-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
            acknowledged
              ? "border-[hsl(174_72%_50%)] bg-[hsl(174_72%_50%)] text-black"
              : "border-white/30"
          }`}
        >
          {acknowledged && <CheckCircle2 className="h-4 w-4" />}
        </div>
      </button>

      <div className="mt-auto pb-2 pt-4">
        <Button
          onClick={onNext}
          disabled={!acknowledged}
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-medium"
        >
          Build my plan <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-white/10 bg-[hsl(0_0%_4%)] px-5 pb-8 pt-6 max-h-[85vh] overflow-y-auto"
        >
          {active && ActiveIcon && (
            <>
              <SheetHeader className="text-left">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl border"
                    style={{
                      borderColor: c(active.hsl, 0.28),
                      background: `radial-gradient(circle at 50% 50%, ${c(active.hsl, 0.32)} 0%, ${c(active.hsl, 0.08)} 70%, transparent 100%)`,
                      boxShadow: `0 0 26px -6px ${c(active.hsl, 0.6)}, inset 0 0 14px ${c(active.hsl, 0.18)}`,
                      color: c(active.hsl),
                    }}
                  >
                    <ActiveIcon className="h-6 w-6 drop-shadow-[0_0_8px_currentColor]" strokeWidth={2.25} />
                  </div>
                  <div>
                    <div
                      className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                      style={{ color: c(active.hsl) }}
                    >
                      {active.title}
                    </div>
                    <SheetTitle className="text-lg font-semibold leading-tight text-white">
                      {active.headline}
                    </SheetTitle>
                  </div>
                </div>
                <SheetDescription className="pt-3 text-sm leading-relaxed text-white/70">
                  {active.body}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-5 space-y-2">
                {active.bullets.map((b) => (
                  <div
                    key={b}
                    className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    <Sparkles
                      className="mt-0.5 h-4 w-4 shrink-0"
                      style={{ color: c(active.hsl) }}
                    />
                    <div className="text-sm leading-snug text-white/85">{b}</div>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => setOpenId(null)}
                className="mt-6 h-12 w-full rounded-2xl text-sm font-medium"
                variant="secondary"
              >
                Got it
              </Button>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
