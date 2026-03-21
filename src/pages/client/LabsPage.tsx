import { useEffect, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Profile } from "@/hooks/useAuth";
import { ArrowLeft, ChevronRight, Flame, Moon, Dumbbell, Apple } from "lucide-react";
import { cn } from "@/lib/utils";

type ClientFeatureSettings = Database["public"]["Tables"]["client_feature_settings"]["Row"];
type AthletePerformanceTier = Database["public"]["Tables"]["athlete_performance_tiers"]["Row"];
type ClientSportProfile = Database["public"]["Tables"]["client_sport_profiles"]["Row"];

interface ClientContext {
  profile: Profile;
  onSignOut: () => void;
}

const TIER_CONFIG: Record<string, { label: string; color: string; min: number; max: number }> = {
  foundation: { label: "Foundation", color: "hsl(215 15% 50%)", min: 0, max: 59 },
  building: { label: "Building", color: "hsl(210 40% 55%)", min: 60, max: 69 },
  competitive: { label: "Competitive", color: "hsl(152 60% 45%)", min: 70, max: 79 },
  advanced: { label: "Advanced", color: "hsl(245 55% 55%)", min: 80, max: 89 },
  elite: { label: "Elite", color: "hsl(45 90% 50%)", min: 90, max: 95 },
  locked_in: { label: "Locked In", color: "hsl(0 0% 80%)", min: 96, max: 100 },
};

function getTierForScore(score: number) {
  if (score >= 96) return TIER_CONFIG.locked_in;
  if (score >= 90) return TIER_CONFIG.elite;
  if (score >= 80) return TIER_CONFIG.advanced;
  if (score >= 70) return TIER_CONFIG.competitive;
  if (score >= 60) return TIER_CONFIG.building;
  return TIER_CONFIG.foundation;
}

function getEngineDisplayName(sport: string, seasonStatus: string) {
  if (sport === "softball") {
    return seasonStatus === "in_season" ? "Game Mode Index™" : "Skill Build Index™";
  }
  if (sport === "basketball") {
    return seasonStatus === "in_season" ? "Game Readiness Index™" : "Development Mode Index™";
  }
  return "Sport Mode Index™";
}

function CircularScore({ score, size = 180 }: { score: number; size?: number }) {
  const tier = getTierForScore(score);
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tier.color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-heading font-bold text-foreground">{score}</span>
        <span className="text-xs font-medium" style={{ color: tier.color }}>{tier.label}</span>
      </div>
    </div>
  );
}

function FactorBar({ label, icon: Icon, value, weight, color }: {
  label: string;
  icon: React.ElementType;
  value: number;
  weight: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ backgroundColor: `${color}20` }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className="text-xs text-muted-foreground">{weight}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${value}%`, backgroundColor: color }}
          />
        </div>
      </div>
      <span className="text-sm font-semibold text-foreground w-8 text-right">{value}</span>
    </div>
  );
}

function SportLabCard({ title, subtitle, onClick }: {
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-card border border-border rounded-2xl p-5 text-left hover:border-primary/30 transition-colors"
      style={{ minHeight: 280 }}
    >
      <div className="flex flex-col h-full justify-between">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <img src="/logo.png" alt="KSOM" className="h-10 w-10 rounded-lg object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div>
              <h3 className="font-heading font-bold text-foreground">{title}</h3>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {title.includes("Diamond") 
              ? "Track swing quality, ball flight, and batting session performance."
              : "Log shooting sessions with pressure mode and streak tracking."}
          </p>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-primary">Enter Lab</span>
          <ChevronRight className="h-4 w-4 text-primary" />
        </div>
      </div>
    </button>
  );
}

export default function LabsPage() {
  const { profile } = useOutletContext<ClientContext>();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<ClientFeatureSettings | null>(null);
  const [tierData, setTierData] = useState<AthletePerformanceTier | null>(null);
  const [sportProfile, setSportProfile] = useState<ClientSportProfile | null>(null);

  useEffect(() => {
    if (!profile?.id) return;

    const fetchData = async () => {
      const [settingsRes, tierRes, sportRes] = await Promise.all([
        supabase.from("client_feature_settings").select("*").eq("client_id", profile.id).maybeSingle(),
        supabase.from("athlete_performance_tiers").select("*").eq("client_id", profile.id).maybeSingle(),
        supabase.from("client_sport_profiles").select("*").eq("client_id", profile.id).limit(1).maybeSingle(),
      ]);
      setSettings(settingsRes.data);
      setTierData(tierRes.data);
      setSportProfile(sportRes.data);
    };

    fetchData();
  }, [profile?.id]);

  const score = tierData?.tier_score ?? 0;
  const sport = sportProfile?.sport ?? "softball";
  const seasonStatus = sportProfile?.season_status ?? "off_season";
  const engineName = getEngineDisplayName(sport, seasonStatus);

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <p className="text-xs text-muted-foreground font-medium tracking-wide uppercase mb-1">
          KSOM Sport Performance System™
        </p>
        <h1 className="text-2xl font-heading font-bold text-foreground">Labs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Built for growth. Tuned for competition.
        </p>
      </div>

      {/* Engine Score Ring */}
      <div className="flex flex-col items-center py-6 px-4">
        <p className="text-xs text-muted-foreground font-medium tracking-wide uppercase mb-4">
          {engineName}
        </p>
        <CircularScore score={score} />
        {sportProfile && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full capitalize">
              {sportProfile.sport}
            </span>
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full capitalize">
              {sportProfile.season_status?.replace("_", " ")}
            </span>
          </div>
        )}
      </div>

      {/* Factor Breakdown */}
      <div className="px-4 mb-6">
        <h2 className="text-sm font-heading font-semibold text-foreground mb-4">Sport Performance Score</h2>
        <div className="space-y-4">
          <FactorBar label="Sleep" icon={Moon} value={0} weight="30%" color="hsl(245 55% 55%)" />
          <FactorBar label="Training Load" icon={Dumbbell} value={0} weight="25%" color="hsl(0 80% 50%)" />
          <FactorBar label="Recovery" icon={Flame} value={0} weight="25%" color="hsl(152 60% 45%)" />
          <FactorBar label="Nutrition" icon={Apple} value={0} weight="20%" color="hsl(35 90% 55%)" />
        </div>
      </div>

      {/* Sport Lab Cards */}
      <div className="px-4 pb-8">
        <h2 className="text-sm font-heading font-semibold text-foreground mb-4">Performance Labs</h2>
        <div className="grid gap-4">
          <SportLabCard
            title="KSOM Diamond Lab™"
            subtitle="Batting & Swing Tracker"
            onClick={() => navigate("/labs/diamond")}
          />
          <SportLabCard
            title="KSOM Hoops Lab™"
            subtitle="Shooting & Pressure Mode"
            onClick={() => navigate("/labs/hoops")}
          />
        </div>
      </div>
    </div>
  );
}
