import { Badge } from "@/components/ui/badge";
import { ChevronRight, Lock, Zap } from "lucide-react";

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
    <div
      className="cursor-pointer transition-all active:scale-[0.99] overflow-hidden rounded-2xl"
      onClick={onClick}
    >
      {/* Metallic dark card */}
      <div
        className="bg-gradient-to-br from-zinc-800 via-zinc-900 to-black p-0 overflow-hidden"
        style={{
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: isActive ? `${color}60` : `${color}30`,
          borderRadius: "1rem",
          boxShadow: `0 4px 20px -4px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)${isActive ? `, 0 0 15px ${color}25` : ""}`,
        }}
      >
        {/* Top section */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className="h-7 w-7 rounded-full flex items-center justify-center shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${color}, ${color}99)`,
                  boxShadow: `0 2px 8px ${color}40`,
                }}
              >
                <Zap className="h-3.5 w-3.5 text-black" />
              </div>
              <span
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{
                  background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {isActive ? "Active Keto Type" : "Keto Type"}
              </span>
            </div>
            {isActive ? (
              <Badge
                className="text-[10px] px-2.5 py-0.5 border"
                style={{
                  backgroundColor: `${color}15`,
                  color: color,
                  borderColor: `${color}30`,
                }}
              >
                ACTIVE
              </Badge>
            ) : (
              <Lock className="h-4 w-4 text-zinc-500" />
            )}
          </div>

          {/* Large abbreviation with metallic gradient text */}
          <h2
            className="text-5xl font-black tracking-tight leading-none mb-2"
            style={{
              background: `linear-gradient(180deg, ${color}dd, ${color}, ${color}88)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {abbreviation}
          </h2>

          {/* Name + subtitle */}
          <h3 className="font-bold text-base text-zinc-200">{name}</h3>
          {subtitle && (
            <p className="text-sm text-zinc-500 mt-0.5">{subtitle}</p>
          )}
        </div>

        {/* Divider */}
        <div className="mx-5 border-t border-zinc-700/50" />

        {/* Stats row */}
        <div className="px-5 py-3 flex items-center gap-5">
          <div>
            <span className="text-lg font-bold" style={{ color }}>{fat_pct}%</span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wide ml-0.5 block">Fat</span>
          </div>
          <div>
            <span className="text-lg font-bold text-zinc-200">{protein_pct}%</span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wide ml-0.5 block">Protein</span>
          </div>
          <div>
            <span className="text-lg font-bold text-zinc-200">{carbs_pct}%</span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wide ml-0.5 block">Carbs</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div>
              <span className="text-lg font-bold text-zinc-300">{getDifficultyLabel(difficulty)}</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wide block">Level</span>
            </div>
            <ChevronRight className="h-5 w-5" style={{ color }} />
          </div>
        </div>
      </div>
    </div>
  );
}
