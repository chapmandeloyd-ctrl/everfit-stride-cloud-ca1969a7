import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, Clock, Calendar, Sparkles, AlertTriangle, Pencil } from "lucide-react";
import MetabolicRing from "../MetabolicRing";
import lionLogo from "@/assets/logo.png";
import { cn } from "@/lib/utils";
import { recommendFastType, type RecommenderInput } from "@/lib/onboarding/aiRecommender";

export type FastType = "long" | "intermittent";

interface FastTypeSelectionStepProps {
  initial?: FastType | null;
  context: RecommenderInput;
  onNext: (fastType: FastType) => void;
}

const OPTIONS = [
  {
    id: "intermittent" as FastType,
    title: "Daily Window Fast",
    description: "Eat every day inside a timed window — 14:10, 16:8, 18:6, 20:4, OMAD",
    icon: Clock,
    highlight: "Beginner → advanced daily rhythm",
  },
  {
    id: "long" as FastType,
    title: "Extended Fast",
    description: "No food for a continuous stretch — 24h, 36h, 48h, 72h, 5-day",
    icon: Calendar,
    highlight: "Advanced metabolic reset",
  },
];

export default function FastTypeSelectionStep({
  initial,
  context,
  onNext,
}: FastTypeSelectionStepProps) {
  const rec = useMemo(() => recommendFastType(context), [context]);
  const [selected, setSelected] = useState<FastType>(initial ?? rec.choice);
  const [adjusting, setAdjusting] = useState(false);
  const chosen = OPTIONS.find((o) => o.id === selected) ?? OPTIONS[0];

  return (
    <div className="flex h-full flex-col animate-fade-in">
      <div className="flex flex-col items-center gap-4 pt-2">
        <div className="relative">
          <MetabolicRing size={140} progress={0} />
          <img
            src={lionLogo}
            alt="Apex360-IF"
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 object-contain"
            style={{ filter: "grayscale(1) brightness(1.4) opacity(0.95)" }}
          />
        </div>

        <div className="text-center space-y-1.5">
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
            <Sparkles className="h-3 w-3" /> Apex360 AI Recommends
          </div>
          <h2 className="text-2xl font-semibold leading-tight tracking-tight">
            Your fasting path
          </h2>
        </div>
      </div>

      <div className="mt-6 flex-1 space-y-4">
        {/* AI pick */}
        <div className="rounded-2xl border border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.10)] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--primary))] text-white">
              <chosen.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="text-lg font-semibold leading-tight">{chosen.title}</div>
                <div className="text-[10px] uppercase tracking-wider text-white/60">Recommended</div>
              </div>
              <div className="mt-0.5 text-xs text-white/70">{chosen.description}</div>
            </div>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm text-white/80">
            {rec.reasons.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-[hsl(var(--primary))]" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
          {rec.warning && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/5 p-2.5 text-xs text-amber-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span>{rec.warning}</span>
            </div>
          )}
          {!rec.warning && (
            <button
              onClick={() => setAdjusting((v) => !v)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2 text-xs font-medium text-white/70 hover:bg-white/5"
            >
              <Pencil className="h-3 w-3" /> {adjusting ? "Hide options" : "Adjust path"}
            </button>
          )}
        </div>

        {adjusting && !rec.warning && (
          <div className="space-y-2">
            {OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = selected === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => setSelected(option.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition",
                    isSelected
                      ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)]"
                      : "border-white/10 bg-white/[0.03]",
                  )}
                >
                  <Icon className="h-4 w-4 text-white/70" />
                  <div className="flex-1 text-sm">
                    <div className="font-medium">{option.title}</div>
                    <div className="text-[11px] text-white/60">{option.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-auto pb-2 pt-6">
        <Button
          onClick={() => onNext(selected)}
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-medium"
        >
          Continue <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
