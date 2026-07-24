import { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import ParticleField from "./ParticleField";

interface Props {
  step: number;
  totalSteps: number;
  onBack?: () => void;
  children: ReactNode;
  showParticles?: boolean;
}

export default function OnboardingShell({
  step,
  totalSteps,
  onBack,
  children,
  showParticles = true,
}: Props) {
  const pct = (step / totalSteps) * 100;
  return (
    <div className="dark relative min-h-[100dvh] bg-[hsl(0_0%_4%)] text-[hsl(0_0%_96%)]">
      {/* Premium gradient backdrop */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 600px at 50% -10%, hsl(var(--primary) / 0.18), transparent 60%), radial-gradient(800px 600px at 80% 110%, hsl(174 72% 50% / 0.12), transparent 60%)",
        }}
      />
      {showParticles && <ParticleField />}

      {/* Top bar */}
      <div className="relative z-10 flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-2">
        {onBack ? (
          <button
            onClick={onBack}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur transition hover:bg-white/10"
            aria-label="Back"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        ) : (
          <div className="h-8 w-8" />
        )}
        <div className="flex-1">
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(174_72%_50%)] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="w-12 text-right text-[10px] uppercase tracking-[0.2em] text-white/50">
          {step}/{totalSteps}
        </div>
      </div>

      {/* Content — capped to viewport so steps scroll internally instead of pushing the CTA off-screen */}
      <div
        className="relative z-10 mx-auto flex w-full max-w-md flex-col px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3"
        style={{ height: "calc(100dvh - 3rem)" }}
      >
        <div key={step} className="flex-1 min-h-0 overflow-y-auto animate-fade-in [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
