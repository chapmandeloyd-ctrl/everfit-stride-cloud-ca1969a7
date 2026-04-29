import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeMacroPercents,
  checkKetoMatch,
  type MacroInput,
} from "@/lib/macroPercents";

interface MacroPercentBarProps {
  macros: MacroInput;
  ketoTypes?: string[] | null;
  /** Compact mode: small inline pill (for list cards). Default = full bar. */
  variant?: "full" | "compact";
  className?: string;
  /** Hide the keto-match indicator entirely. */
  hideMatch?: boolean;
}

/**
 * Visualizes the % of calories from Protein / Fat / Carbs and
 * indicates whether the breakdown matches the meal's keto profile.
 */
export function MacroPercentBar({
  macros,
  ketoTypes,
  variant = "full",
  className,
  hideMatch = false,
}: MacroPercentBarProps) {
  const breakdown = computeMacroPercents(macros);
  const match = checkKetoMatch(breakdown, ketoTypes);

  if (!breakdown.hasData) return null;

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-1.5 text-[10px] font-semibold", className)}>
        <span className="text-yellow-500">{breakdown.fatPct}%F</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-blue-500">{breakdown.proteinPct}%P</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-green-500">{breakdown.carbsPct}%C</span>
        {!hideMatch && match.status !== "unknown" && (
          <MatchIcon status={match.status} className="h-3 w-3 ml-0.5" />
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Stacked bar */}
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="bg-yellow-500"
          style={{ width: `${breakdown.fatPct}%` }}
          title={`Fat ${breakdown.fatPct}%`}
        />
        <div
          className="bg-blue-500"
          style={{ width: `${breakdown.proteinPct}%` }}
          title={`Protein ${breakdown.proteinPct}%`}
        />
        <div
          className="bg-green-500"
          style={{ width: `${breakdown.carbsPct}%` }}
          title={`Carbs ${breakdown.carbsPct}%`}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <Legend color="bg-yellow-500" label="Fat" pct={breakdown.fatPct} />
          <Legend color="bg-blue-500" label="Protein" pct={breakdown.proteinPct} />
          <Legend color="bg-green-500" label="Carbs" pct={breakdown.carbsPct} />
        </div>
        {!hideMatch && match.status !== "unknown" && (
          <div
            className={cn(
              "flex items-center gap-1 font-semibold",
              match.status === "match" && "text-emerald-500",
              match.status === "warning" && "text-amber-500",
              match.status === "violation" && "text-red-500"
            )}
          >
            <MatchIcon status={match.status} className="h-3.5 w-3.5" />
            <span className="text-[11px]">
              {match.status === "match"
                ? "Matches profile"
                : match.reason ?? "Off-profile"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function Legend({ color, label, pct }: { color: string; label: string; pct: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", color)} />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold text-foreground">{pct}%</span>
    </div>
  );
}

function MatchIcon({
  status,
  className,
}: {
  status: "match" | "warning" | "violation" | "unknown";
  className?: string;
}) {
  if (status === "match") return <CheckCircle2 className={className} />;
  if (status === "violation") return <XCircle className={className} />;
  return <AlertTriangle className={className} />;
}