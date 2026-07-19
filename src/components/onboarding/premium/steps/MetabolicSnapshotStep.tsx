import { Button } from "@/components/ui/button";
import MetabolicGauge from "../MetabolicGauge";
import BodySilhouette from "../BodySilhouette";
import type { MetabolicSnapshot } from "@/lib/onboarding/metabolicCalc";
import { Heart, Sparkles, ShieldCheck, Gauge } from "lucide-react";

const IMPROVEMENTS = [
  { Icon: Sparkles, title: "Better Energy" },
  { Icon: Heart, title: "Improved Appetite Control" },
  { Icon: ShieldCheck, title: "Reduced Inflammation" },
  { Icon: Gauge, title: "Metabolic Stability" },
];

export default function MetabolicSnapshotStep({
  snap,
  bmiClass,
  bmi,
  sex,
  onNext,
}: {
  snap: MetabolicSnapshot;
  bmiClass: string;
  bmi: number;
  sex: "male" | "female" | "other";
  onNext: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-5 pb-2">
      <div>
        <div className="text-xs uppercase tracking-[0.25em] text-white/50">Metabolic Snapshot</div>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Where you stand today</h2>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <MetabolicGauge score={snap.metabolicScore} />
          <BodySilhouette bmi={bmi} sex={sex} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-white/[0.04] p-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">BMI</div>
            <div className="mt-1 text-lg font-semibold">{bmi}</div>
          </div>
          <div className="rounded-xl bg-white/[0.04] p-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">Class</div>
            <div className="mt-1 text-sm font-medium">{bmiClass}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-sm leading-relaxed text-white/75">
          Your current metrics suggest your metabolism may be working harder than ideal — affecting
          energy regulation, appetite signals, and metabolic flexibility.
        </p>
      </div>

      <div className="rounded-2xl border border-[hsl(174_72%_50%/0.3)] bg-[hsl(174_72%_50%/0.06)] p-5">
        <div className="text-xs uppercase tracking-[0.25em] text-[hsl(174_72%_60%)]">The good news</div>
        <p className="mt-2 text-sm leading-relaxed text-white/85">
          Metabolic health is highly adaptable. Structured fasting, protein-focused nutrition,
          movement, and recovery support create meaningful change.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {IMPROVEMENTS.map(({ Icon, title }) => (
          <div
            key={title}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex items-center gap-2"
          >
            <Icon className="h-4 w-4 text-[hsl(var(--primary))]" />
            <span className="text-xs text-white/80">{title}</span>
          </div>
        ))}
      </div>

      <Button onClick={onNext} size="lg" className="h-14 w-full rounded-2xl text-base font-medium">
        See how APEX360-IF360 helps
      </Button>
    </div>
  );
}
