import { InteractiveProtocolCard } from "@/components/plan/InteractiveProtocolCard";
import { buildSynergyProtocol } from "@/lib/synergyDemoContent";

const synergyProtocol = buildSynergyProtocol();

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