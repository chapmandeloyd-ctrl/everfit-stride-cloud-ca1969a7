import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Check, Edit3, Lightbulb, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { type ValidationFlag, FLAG_LABELS } from "@/components/nutrition/macroValidator";

interface MacroValues {
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
}

export interface CorrectionData {
  mealName: string;
  source: string;
  original: MacroValues;
  corrected: MacroValues;
  flags: ValidationFlag[];
  suggestion: string | null;
}

interface MacroCorrectionDrawerProps {
  data: CorrectionData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: (finalMacros: MacroValues, action: "accepted" | "edited") => void;
  onReject: () => void;
  isLogging?: boolean;
}

const MACRO_KEYS: (keyof MacroValues)[] = ["calories", "protein", "fats", "carbs"];

const macroMeta: Record<keyof MacroValues, { label: string; unit: string; color: string }> = {
  calories: { label: "Calories", unit: "cal", color: "text-orange-500" },
  protein: { label: "Protein", unit: "g", color: "text-blue-500" },
  fats: { label: "Fat", unit: "g", color: "text-yellow-500" },
  carbs: { label: "Carbs", unit: "g", color: "text-emerald-500" },
};

export function MacroCorrectionDrawer({
  data,
  open,
  onOpenChange,
  onAccept,
  onReject,
  isLogging = false,
}: MacroCorrectionDrawerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<MacroValues>({ calories: 0, protein: 0, fats: 0, carbs: 0 });

  if (!data) return null;

  const displayValues = isEditing ? editValues : data.corrected;

  const handleStartEdit = () => {
    setEditValues({ ...data.corrected });
    setIsEditing(true);
  };

  const handleAccept = () => {
    onAccept(displayValues, isEditing ? "edited" : "accepted");
    setIsEditing(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <div className="p-4 space-y-4 overflow-y-auto">
          <DrawerHeader className="p-0">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <DrawerTitle className="text-lg font-bold">Macro Correction</DrawerTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              We adjusted <span className="font-semibold text-foreground">{data.mealName}</span> for accuracy
            </p>
          </DrawerHeader>

          {/* Flags */}
          <div className="flex flex-wrap gap-1">
            {data.flags.map((flag) => (
              <Badge key={flag} variant="outline" className="text-[9px] font-mono border-destructive/40 text-destructive">
                {FLAG_LABELS[flag] || flag}
              </Badge>
            ))}
          </div>

          {/* Original vs Corrected comparison */}
          <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2 border-b border-border/50">
              <span>Macro</span>
              <span className="text-center">Original</span>
              <span className="text-center">Corrected</span>
            </div>

            {MACRO_KEYS.map((key) => {
              const meta = macroMeta[key];
              const orig = data.original[key] ?? 0;
              const corr = displayValues[key];
              const changed = Math.abs(orig - corr) > 0.5;

              return (
                <div
                  key={key}
                  className={cn(
                    "grid grid-cols-3 items-center px-3 py-2.5 border-b border-border/30 last:border-0",
                    changed && "bg-primary/5"
                  )}
                >
                  <span className={cn("text-xs font-semibold", meta.color)}>
                    {meta.label}
                  </span>
                  <span className={cn(
                    "text-center text-sm",
                    changed ? "line-through text-muted-foreground/60" : "text-muted-foreground"
                  )}>
                    {Math.round(orig)}{meta.unit}
                  </span>
                  <div className="text-center">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editValues[key]}
                        onChange={(e) =>
                          setEditValues((prev) => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))
                        }
                        className="h-7 text-center text-sm font-bold p-1 w-20 mx-auto"
                      />
                    ) : (
                      <span className={cn("text-sm font-bold", changed && "text-primary")}>
                        {Math.round(corr)}{meta.unit}
                        {changed && <ArrowRight className="inline h-3 w-3 ml-1 text-primary/60" />}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Suggestion */}
          {data.suggestion && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-foreground font-medium">{data.suggestion}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2">
            <Button
              className="w-full h-12 text-base font-bold rounded-xl"
              onClick={handleAccept}
              disabled={isLogging}
            >
              {isLogging ? "Logging..." : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {isEditing ? "Confirm My Edits" : "Accept Corrections"}
                </>
              )}
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 text-xs"
                onClick={handleStartEdit}
                disabled={isEditing || isLogging}
              >
                <Edit3 className="h-3 w-3 mr-1" />
                Edit Manually
              </Button>
              <Button
                variant="ghost"
                className="flex-1 text-xs text-muted-foreground"
                onClick={onReject}
                disabled={isLogging}
              >
                <X className="h-3 w-3 mr-1" />
                Use Original
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
