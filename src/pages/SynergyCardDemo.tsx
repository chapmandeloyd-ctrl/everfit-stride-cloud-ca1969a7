import { Sparkles } from "lucide-react";
import { InteractiveProtocolCard } from "@/components/plan/InteractiveProtocolCard";
import type { DemoProtocol } from "@/components/plan/InteractiveProtocolCardDemo";
import type { ProtocolCardContent } from "@/lib/protocolCardContent";

const synergyContent: ProtocolCardContent = {
  overview: [
    "The 72-hour fast and HPKD work as one metabolic switch: the fast strips glycogen and pushes ketones to therapeutic levels, then HPKD locks that fat-burning state in once you eat again.",
    "By holding protein at ~30% post-fast, you repair training damage and protect lean mass — exactly where standard keto loses people.",
  ],
  phases: [
    {
      range: "Hour 0–24",
      title: "Glycogen Burn",
      detail: "Stored glucose drains. Insulin drops. The body starts switching its primary fuel from glucose to fat.",
    },
    {
      range: "Hour 24–48",
      title: "Ketosis Locks In",
      detail: "Ketone bodies rise to therapeutic levels. Mental clarity sharpens, hunger flattens, fat oxidation accelerates.",
    },
    {
      range: "Hour 48–72",
      title: "Deep Autophagy",
      detail: "Cellular cleanup peaks. Damaged proteins are recycled. Growth hormone climbs to protect lean tissue.",
    },
    {
      range: "Refeed → HPKD",
      title: "Repair & Reinforce",
      detail: "30% protein refeed drives muscle protein synthesis. Fat-fueled environment keeps you in ketosis instead of crashing out.",
    },
  ],
  benefits: [
    "Maximum endogenous fat oxidation",
    "Lean muscle protected through the fast",
    "Reinforced metabolic flexibility post-refeed",
    "Perpetual loop of autophagy + MPS",
  ],
  rules: [
    "Hold the 72h fast clean — water, electrolytes, black coffee only",
    "Break the fast with protein-led HPKD meals (~30% protein)",
    "Keep carbs ≤20g net post-fast to stay in ketosis",
    "Prioritize sodium, potassium, magnesium throughout",
    "Don't train hard inside the fast — schedule lifts in the refeed window",
  ],
  mentalReality: [
    "Hours 18–36 are the hardest — that's the metabolic switch flipping.",
    "Once ketones rise, hunger drops sharply. Trust the curve.",
    "The refeed is part of the protocol, not a reward — eat it as prescribed.",
  ],
  schedule: [
    { label: "Fast Length", detail: "72 hours" },
    { label: "Refeed Style", detail: "HPKD (60% fat / 35% protein / 5% carbs)" },
    { label: "Protein Target", detail: "~30% of refeed calories" },
    { label: "Carb Ceiling", detail: "≤20g net carbs/day post-fast" },
  ],
  coachWarning: [
    "If you feel dizzy or weak, hit electrolytes immediately — most issues are sodium loss, not the fast.",
    "Don't extend past 72h on your own. Talk to your coach first.",
  ],
};

const synergyProtocol: DemoProtocol = {
  id: "synergy-72h-hpkd",
  icon: Sparkles,
  accentColorClass: "text-red-500",
  iconGradient: "from-red-500 to-rose-600",
  surfaceTintGradient: "from-red-500/10 via-transparent to-transparent",
  eyebrow: "Protocol + Keto Synergy",
  subEyebrow: "72h Fast × HPKD",
  title: "72h × HPKD",
  titleSuffix: " — one metabolic switch",
  stats: [
    { value: "72h", label: "Fast", accentClass: "text-red-500" },
    { value: "30%", label: "Protein" },
    { value: "Auto+MPS", label: "Outcome" },
  ],
  status: "current",
  content: synergyContent,
};

export default function SynergyCardDemo() {
  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="max-w-md mx-auto pt-6 px-5">
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Demo
          </p>
          <h1 className="text-lg font-bold leading-tight">Protocol + Keto Synergy Card</h1>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Protocol + Keto Synergy
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <InteractiveProtocolCard
          protocol={synergyProtocol}
          frontExtra="timelineAndChips"
        />
      </div>
    </div>
  );
}