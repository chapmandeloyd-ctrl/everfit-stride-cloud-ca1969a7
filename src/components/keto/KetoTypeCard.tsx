import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Zap } from "lucide-react";

interface KetoTypeCardProps {
  abbreviation: string;
  name: string;
  subtitle: string | null;
  fat_pct: number;
  protein_pct: number;
  carbs_pct: number;
  difficulty: string;
  color: string;
  isActive?: boolean;
  onClick?: () => void;
}

export function KetoTypeCard({
  abbreviation, name, subtitle, fat_pct, protein_pct, carbs_pct,
  difficulty, color, isActive = false, onClick,
}: KetoTypeCardProps) {
  const getDifficultyLabel = (d: string) => {
    if (d === "beginner") return "Beginner";
    if (d === "intermediate") return "Intermediate";
    if (d === "advanced") return "Advanced";
    return d;
  };

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md active:scale-[0.99] overflow-hidden"
      style={{
        borderColor: isActive ? color : undefined,
        backgroundColor: isActive ? `${color}04` : undefined,
      }}
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Top section with badge */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className="h-7 w-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${color}15` }}
              >
                <Zap className="h-3.5 w-3.5" style={{ color }} />
              </div>
              <span
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color }}
              >
                {isActive ? "Active Keto Type" : "Keto Type"}
              </span>
            </div>
            {isActive && (
              <Badge
                className="text-[10px] px-2.5 py-0.5 border"
                style={{
                  backgroundColor: `${color}12`,
                  color: color,
                  borderColor: `${color}30`,
                }}
              >
                ACTIVE
              </Badge>
            )}
          </div>

          {/* Large abbreviation */}
          <h2
            className="text-5xl font-black tracking-tight leading-none mb-2"
            style={{ color }}
          >
            {abbreviation}
          </h2>

          {/* Name + subtitle */}
          <h3 className="font-bold text-base">{name}</h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>

        {/* Divider */}
        <div className="mx-5 border-t" />

        {/* Stats row */}
        <div className="px-5 py-3 flex items-center gap-5">
          <div>
            <span className="text-lg font-bold" style={{ color }}>{fat_pct}%</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide ml-0.5 block">Fat</span>
          </div>
          <div>
            <span className="text-lg font-bold">{protein_pct}%</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide ml-0.5 block">Protein</span>
          </div>
          <div>
            <span className="text-lg font-bold">{carbs_pct}%</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide ml-0.5 block">Carbs</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div>
              <span className="text-lg font-bold">{getDifficultyLabel(difficulty)}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide block">Level</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
