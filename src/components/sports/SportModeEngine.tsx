import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * 6-tier system:
 * Foundation (0–59) Slate, Building (60–69) Steel Blue, Competitive (70–79) Emerald,
 * Advanced (80–89) Indigo, Elite (90–95) Gold, Locked In (96–100) Platinum
 */
const TIERS = [
  { name: "Foundation", min: 0, max: 59, color: "hsl(215, 15%, 55%)", ring: "stroke-slate-400" },
  { name: "Building", min: 60, max: 69, color: "hsl(207, 44%, 55%)", ring: "stroke-sky-500" },
  { name: "Competitive", min: 70, max: 79, color: "hsl(152, 55%, 50%)", ring: "stroke-emerald-500" },
  { name: "Advanced", min: 80, max: 89, color: "hsl(234, 60%, 55%)", ring: "stroke-indigo-500" },
  { name: "Elite", min: 90, max: 95, color: "hsl(45, 90%, 50%)", ring: "stroke-amber-400" },
  { name: "Locked In", min: 96, max: 100, color: "hsl(220, 10%, 85%)", ring: "stroke-gray-200" },
] as const;

function getTier(score: number) {
  return TIERS.find((t) => score >= t.min && score <= t.max) || TIERS[0];
}

interface SportModeEngineProps {
  sport: string;
  seasonStatus: string;
}

/**
 * Context-aware engine name:
 * Softball In-Season → Game Mode Index™
 * Softball Off-Season → Skill Build Index™
 * Basketball In-Season → Game Readiness Index™
 * Basketball Off-Season → Development Mode Index™
 */
function getEngineName(sport: string, season: string): string {
  if (sport === "softball" || sport === "baseball") {
    return season === "in-season" ? "Game Mode Index™" : "Skill Build Index™";
  }
  if (sport === "basketball") {
    return season === "in-season" ? "Game Readiness Index™" : "Development Mode Index™";
  }
  return "Sport Mode Index™";
}

export function SportModeEngine({ sport, seasonStatus }: SportModeEngineProps) {
  const clientId = useEffectiveClientId();

  const { data: tierData } = useQuery({
    queryKey: ["athlete-performance-tier", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athlete_performance_tiers")
        .select("*")
        .eq("client_id", clientId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const score = tierData?.tier_score ?? 0;
  const tier = getTier(score);
  const engineName = getEngineName(sport, seasonStatus);

  // SVG ring calculations
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const dashOffset = circumference - progress;

  return (
    <div className="flex flex-col items-center py-6">
      {/* Engine Title */}
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">
        KSOM Sport Mode Engine™
      </p>
      <p className="text-xs font-semibold text-muted-foreground mb-4">{engineName}</p>

      {/* Circular Ring */}
      <div className="relative w-44 h-44">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
          {/* Background ring */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="10"
            opacity="0.3"
          />
          {/* Progress ring */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={tier.color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black tabular-nums" style={{ color: tier.color }}>
            {score}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
            / 100
          </span>
        </div>
      </div>

      {/* Tier Badge */}
      <div
        className="mt-4 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border"
        style={{
          color: tier.color,
          borderColor: tier.color,
          backgroundColor: `${tier.color}15`,
        }}
      >
        {tier.name}
      </div>

      {/* 30-day rolling label */}
      <p className="text-[10px] text-muted-foreground mt-2">30-day rolling average</p>
    </div>
  );
}
