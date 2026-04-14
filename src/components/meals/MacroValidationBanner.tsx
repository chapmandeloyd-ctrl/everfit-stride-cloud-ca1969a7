import { AlertTriangle, ShieldAlert, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { type ValidationFlag, FLAG_LABELS } from "@/components/nutrition/macroValidator";
import { cn } from "@/lib/utils";

interface MacroValidationBannerProps {
  flags: ValidationFlag[];
  warnings: string[];
  className?: string;
  compact?: boolean;
}

export function MacroValidationBanner({ flags, warnings, className, compact = false }: MacroValidationBannerProps) {
  if (flags.length === 0) return null;

  const hasCritical = flags.some((f) =>
    ["missing_fat", "missing_protein", "missing_calories", "missing_carbs", "incomplete_macros", "calorie_mismatch"].includes(f)
  );

  const Icon = hasCritical ? ShieldAlert : AlertTriangle;
  const borderColor = hasCritical ? "border-destructive/30" : "border-amber-500/20";
  const bgColor = hasCritical ? "bg-destructive/10" : "bg-amber-500/10";
  const iconColor = hasCritical ? "text-destructive" : "text-amber-400";

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-lg", bgColor, borderColor, "border", className)}>
        <Icon className={cn("h-3.5 w-3.5 shrink-0", iconColor)} />
        <span className="text-[10px] text-muted-foreground font-medium">
          {hasCritical ? "Macro data issue — review before logging" : "Review suggested"}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border p-3 space-y-2", bgColor, borderColor, className)}>
      <div className="flex items-start gap-2">
        <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", iconColor)} />
        <div className="space-y-1.5 flex-1">
          <p className="text-xs font-semibold">
            {hasCritical
              ? "⚠️ This meal may be inaccurate — review before logging"
              : "Macro review suggested"}
          </p>

          {/* Flag badges */}
          <div className="flex flex-wrap gap-1">
            {flags.map((flag) => (
              <Badge
                key={flag}
                variant="outline"
                className={cn(
                  "text-[9px] font-mono",
                  hasCritical ? "border-destructive/40 text-destructive" : "border-amber-500/40 text-amber-400"
                )}
              >
                {FLAG_LABELS[flag]}
              </Badge>
            ))}
          </div>

          {/* Detailed warnings */}
          {warnings.length > 0 && (
            <ul className="space-y-0.5">
              {warnings.map((w, i) => (
                <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1">
                  <Info className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/60" />
                  {w}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
