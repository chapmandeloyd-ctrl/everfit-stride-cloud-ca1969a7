import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Percent, Scale } from "lucide-react";

interface KetoMacroEditorProps {
  ketoTypeId: string;
  fat_pct: number;
  protein_pct: number;
  carbs_pct: number;
  carb_limit_grams: number | null;
  color: string;
  abbreviation: string;
  clientId?: string; // optional — used to fetch calorie target for gram mode
}

export function KetoMacroEditor({
  ketoTypeId,
  fat_pct,
  protein_pct,
  carbs_pct,
  carb_limit_grams,
  color,
  abbreviation,
  clientId,
}: KetoMacroEditorProps) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"pct" | "grams">("pct");
  const [fat, setFat] = useState(fat_pct);
  const [protein, setProtein] = useState(protein_pct);
  const [carbs, setCarbs] = useState(carbs_pct);
  const [carbLimit, setCarbLimit] = useState(carb_limit_grams);

  // Fetch client calorie target for gram calculations
  const { data: macroTarget } = useQuery({
    queryKey: ["macro-editor-calories", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_macro_targets")
        .select("id, target_calories")
        .eq("client_id", clientId!)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    enabled: !!clientId,
  });

  const calories = macroTarget?.target_calories || 2000;

  // Convert % to grams
  const fatGrams = Math.round((fat / 100) * calories / 9);
  const proteinGrams = Math.round((protein / 100) * calories / 4);
  const carbsGrams = Math.round((carbs / 100) * calories / 4);

  // Sync from props when they change
  useEffect(() => {
    setFat(fat_pct);
    setProtein(protein_pct);
    setCarbs(carbs_pct);
    setCarbLimit(carb_limit_grams);
  }, [fat_pct, protein_pct, carbs_pct, carb_limit_grams]);

  const saveMutation = useMutation({
    mutationFn: async (vals: { fat_pct: number; protein_pct: number; carbs_pct: number; carb_limit_grams: number | null }) => {
      const { error } = await supabase
        .from("keto_types")
        .update(vals)
        .eq("id", ketoTypeId);
      if (error) throw error;

      // Auto-sync gram targets for all clients on this keto type
      const { data: assignments } = await supabase
        .from("client_keto_assignments")
        .select("client_id")
        .eq("keto_type_id", ketoTypeId)
        .eq("is_active", true);

      if (assignments && assignments.length > 0) {
        for (const a of assignments) {
          const { data: mt } = await supabase
            .from("client_macro_targets")
            .select("id, target_calories")
            .eq("client_id", a.client_id)
            .eq("is_active", true)
            .maybeSingle();

          if (mt?.target_calories) {
            const cal = mt.target_calories;
            await supabase
              .from("client_macro_targets")
              .update({
                target_fats: Math.round((vals.fat_pct / 100) * cal / 9),
                target_protein: Math.round((vals.protein_pct / 100) * cal / 4),
                target_carbs: Math.round((vals.carbs_pct / 100) * cal / 4),
                diet_style: "keto",
              })
              .eq("id", mt.id);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-keto-types"] });
      queryClient.invalidateQueries({ queryKey: ["synergy-all-keto-types"] });
      queryClient.invalidateQueries({ queryKey: ["synergy-panel-keto"] });
      queryClient.invalidateQueries({ queryKey: ["client-keto-assignment"] });
      queryClient.invalidateQueries({ queryKey: ["client-macro-targets"] });
      toast.success("Macros updated — client targets synced in real-time");
    },
    onError: () => toast.error("Failed to update macros"),
  });

  const total = fat + protein + carbs;

  // Debounced auto-save
  useEffect(() => {
    const timer = setTimeout(() => {
      if (fat !== fat_pct || protein !== protein_pct || carbs !== carbs_pct || carbLimit !== carb_limit_grams) {
        saveMutation.mutate({ fat_pct: fat, protein_pct: protein, carbs_pct: carbs, carb_limit_grams: carbLimit });
      }
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fat, protein, carbs, carbLimit]);

  // Gram mode: convert grams back to percentages
  const setFatFromGrams = (g: number) => {
    setFat(Math.round((g * 9 / calories) * 100));
  };
  const setProteinFromGrams = (g: number) => {
    setProtein(Math.round((g * 4 / calories) * 100));
  };
  const setCarbsFromGrams = (g: number) => {
    setCarbs(Math.round((g * 4 / calories) * 100));
  };

  const maxPct = Math.max(fat, protein, carbs, 1);
  const maxGrams = Math.max(fatGrams, proteinGrams, carbsGrams, 1);
  const isGrams = mode === "grams";

  return (
    <Card className="border" style={{ borderColor: `${color}30` }}>
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-black" style={{ color }}>{abbreviation}</span>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Macro Editor</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Mode toggle */}
            <div className="flex rounded-md border overflow-hidden">
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 px-2.5 rounded-none text-[10px] font-bold ${mode === "pct" ? "bg-muted" : ""}`}
                onClick={() => setMode("pct")}
              >
                <Percent className="h-3 w-3 mr-1" />
                %
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 px-2.5 rounded-none text-[10px] font-bold ${mode === "grams" ? "bg-muted" : ""}`}
                onClick={() => setMode("grams")}
              >
                <Scale className="h-3 w-3 mr-1" />
                g
              </Button>
            </div>
            <span className={`text-xs font-medium ${total === 100 ? "text-green-600" : "text-destructive"}`}>
              {total}%
            </span>
          </div>
        </div>

        {isGrams && (
          <div className="text-[10px] text-muted-foreground bg-muted/50 rounded px-2 py-1">
            Based on <strong>{calories} cal/day</strong> target
            {!macroTarget?.target_calories && !clientId && <span> (default)</span>}
          </div>
        )}

        {/* Fat */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Fat</Label>
            <div className="flex items-center gap-1.5">
              {isGrams ? (
                <>
                  <Input
                    type="number"
                    className="h-7 w-16 text-xs text-center"
                    value={fatGrams}
                    onChange={(e) => setFatFromGrams(Math.max(0, +e.target.value))}
                  />
                  <span className="text-xs text-muted-foreground">g</span>
                  <span className="text-[10px] text-muted-foreground ml-1">({fat}%)</span>
                </>
              ) : (
                <>
                  <Input
                    type="number"
                    className="h-7 w-14 text-xs text-center"
                    value={fat}
                    onChange={(e) => setFat(Math.max(0, Math.min(100, +e.target.value)))}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </>
              )}
            </div>
          </div>
          <Slider
            value={[isGrams ? fatGrams : fat]}
            onValueChange={([v]) => isGrams ? setFatFromGrams(v) : setFat(v)}
            max={isGrams ? Math.round(calories / 9) : 100}
            step={1}
            className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
          />
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${isGrams ? (fatGrams / maxGrams) * 100 : (fat / maxPct) * 100}%`,
                backgroundColor: color,
              }}
            />
          </div>
        </div>

        {/* Protein */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Protein</Label>
            <div className="flex items-center gap-1.5">
              {isGrams ? (
                <>
                  <Input
                    type="number"
                    className="h-7 w-16 text-xs text-center"
                    value={proteinGrams}
                    onChange={(e) => setProteinFromGrams(Math.max(0, +e.target.value))}
                  />
                  <span className="text-xs text-muted-foreground">g</span>
                  <span className="text-[10px] text-muted-foreground ml-1">({protein}%)</span>
                </>
              ) : (
                <>
                  <Input
                    type="number"
                    className="h-7 w-14 text-xs text-center"
                    value={protein}
                    onChange={(e) => setProtein(Math.max(0, Math.min(100, +e.target.value)))}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </>
              )}
            </div>
          </div>
          <Slider
            value={[isGrams ? proteinGrams : protein]}
            onValueChange={([v]) => isGrams ? setProteinFromGrams(v) : setProtein(v)}
            max={isGrams ? Math.round(calories / 4) : 100}
            step={1}
            className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
          />
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${isGrams ? (proteinGrams / maxGrams) * 100 : (protein / maxPct) * 100}%`,
                backgroundColor: "#94a3b8",
              }}
            />
          </div>
        </div>

        {/* Carbs */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Carbs</Label>
            <div className="flex items-center gap-1.5">
              {isGrams ? (
                <>
                  <Input
                    type="number"
                    className="h-7 w-16 text-xs text-center"
                    value={carbsGrams}
                    onChange={(e) => setCarbsFromGrams(Math.max(0, +e.target.value))}
                  />
                  <span className="text-xs text-muted-foreground">g</span>
                  <span className="text-[10px] text-muted-foreground ml-1">({carbs}%)</span>
                </>
              ) : (
                <>
                  <Input
                    type="number"
                    className="h-7 w-14 text-xs text-center"
                    value={carbs}
                    onChange={(e) => setCarbs(Math.max(0, Math.min(100, +e.target.value)))}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </>
              )}
            </div>
          </div>
          <Slider
            value={[isGrams ? carbsGrams : carbs]}
            onValueChange={([v]) => isGrams ? setCarbsFromGrams(v) : setCarbs(v)}
            max={isGrams ? Math.round(calories / 4) : 100}
            step={1}
            className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
          />
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${isGrams ? (carbsGrams / maxGrams) * 100 : (carbs / maxPct) * 100}%`,
                backgroundColor: "#475569",
              }}
            />
          </div>
        </div>

        {/* Carb Limit */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Label className="text-xs">Carb Limit (g)</Label>
          <Input
            type="number"
            className="h-7 w-16 text-xs text-center"
            value={carbLimit ?? ""}
            onChange={(e) => setCarbLimit(e.target.value ? +e.target.value : null)}
            placeholder="—"
          />
        </div>
      </CardContent>
    </Card>
  );
}
