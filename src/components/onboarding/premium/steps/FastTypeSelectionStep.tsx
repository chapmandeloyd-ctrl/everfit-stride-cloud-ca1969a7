import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, Clock, Calendar } from "lucide-react";
import MetabolicRing from "../MetabolicRing";
import lionLogo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

export type FastType = "long" | "intermittent";

interface FastTypeSelectionStepProps {
  initial?: FastType | null;
  onNext: (fastType: FastType) => void;
}

const OPTIONS = [
  {
    id: "long" as FastType,
    title: "Long Fast",
    description: "For extended fasting (e.g. 1–5 days)",
    icon: Calendar,
    highlight: "Deep metabolic reset",
  },
  {
    id: "intermittent" as FastType,
    title: "Intermittent Fast",
    description: "For daily patterns like 16:8 or OMAD",
    icon: Clock,
    highlight: "Daily rhythm & consistency",
  },
];

export default function FastTypeSelectionStep({
  initial,
  onNext,
}: FastTypeSelectionStepProps) {
  const [selected, setSelected] = useState<FastType | null>(initial ?? null);

  return (
    <div className="flex h-full flex-col animate-fade-in">
      <div className="flex flex-col items-center gap-6 pt-2">
        <div className="relative">
          <MetabolicRing size={180} progress={0} />
          <img
            src={lionLogo}
            alt="Apex360-IF"
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 object-contain"
            style={{ filter: "grayscale(1) brightness(1.4) opacity(0.95)" }}
          />
        </div>

        <div className="text-center space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
            Choose Your Path
          </div>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Long or Intermittent?
          </h2>
          <p className="mx-auto max-w-sm text-base leading-relaxed text-white/70">
            What type of fast do you want to start?
          </p>
        </div>
      </div>

      <div className="mt-8 flex-1 space-y-3">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selected === option.id;
          return (
            <button
              key={option.id}
              onClick={() => setSelected(option.id)}
              className={cn(
                "group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200",
                isSelected
                  ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.12)]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
              )}
            >
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors",
                  isSelected
                    ? "bg-[hsl(var(--primary))] text-white"
                    : "bg-white/10 text-white/70"
                )}
              >
                <Icon className="h-6 w-6" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-lg font-semibold leading-tight">
                  {option.title}
                </div>
                <div className="mt-0.5 text-sm text-white/70">
                  {option.description}
                </div>
                <div className="mt-1.5 text-xs font-medium text-[hsl(var(--primary))]">
                  {option.highlight}
                </div>
              </div>

              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors",
                  isSelected
                    ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white"
                    : "border-white/20 text-white/40"
                )}
              >
                <ChevronRight
                  className={cn(
                    "h-4 w-4 transition-transform",
                    isSelected && "translate-x-0.5"
                  )}
                />
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-auto pb-2 pt-6">
        <Button
          onClick={() => selected && onNext(selected)}
          disabled={!selected}
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-medium"
        >
          Continue <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
