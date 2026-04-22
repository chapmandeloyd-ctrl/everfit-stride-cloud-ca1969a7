import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

function SectionHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      {icon}
      <h3 className="text-sm font-bold uppercase tracking-wide">{title}</h3>
    </div>
  );
}

const DEMO_TEXT =
  "The KSOM-360 72-hour fasting protocol integrated with the High Protein Ketogenic Diet (HPKD) functions as a singular metabolic switch designed to maximize endogenous fat oxidation while safeguarding lean muscle tissue. The extended 72-hour fast serves as the aggressive catalyst, stripping glycogen stores and elevating ketone bodies to therapeutic levels, while the HPKD architecture stabilizes this state during the refeed period. By maintaining a 30% protein intake post-fast, you provide the essential amino acids required to repair tissue damaged during training, preventing the catabolic breakdown often associated with standard ketogenic approaches. This synergy ensures that the metabolic flexibility gained during the fast is not lost upon eating, but rather reinforced through a fat-fueled, protein-sparing environment. Ultimately, the system cycles between deep cellular autophagy and targeted muscle protein synthesis, creating a perpetual loop of fat loss and physical preservation.";

export default function SynergyCardDemo() {
  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="max-w-md mx-auto pt-6">
        <div className="px-5 mb-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Demo
          </p>
          <h1 className="text-lg font-bold leading-tight">Protocol + Keto Synergy Card</h1>
        </div>

        {/* Section divider — same as live page */}
        <div className="px-5 mt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Protocol + Keto Synergy
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
        </div>

        {/* The synergy card — exact match to ClientCompletePlan */}
        <div className="px-5">
          <Card>
            <CardContent className="p-5">
              <SectionHeader
                title="Protocol + Keto Synergy"
                icon={<Sparkles className="h-4 w-4 text-primary" />}
              />
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-3 -mt-1">
                72h × HPKD
              </p>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {DEMO_TEXT}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}