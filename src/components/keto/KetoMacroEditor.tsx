import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Percent, Scale, Globe } from "lucide-react";

interface KetoMacroEditorProps {
  ketoTypeId: string;
  fat_pct: number;
  protein_pct: number;
  carbs_pct: number;
  carb_limit_grams: number | null;
  color: string;
  abbreviation: string;
  clientId?: string;
  /** Persisted macro mode from the keto_types table */
  macro_mode?: string;
  /** Default gram values from keto_types */
  protein_grams?: number | null;
  fat_grams?: number | null;
  carb_grams?: number | null;
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
  macro_mode: initialMacroMode,
  protein_grams: initialProteinGrams,
  fat_grams: initialFatGrams,
  carb_grams: initialCarbGrams,
}: KetoMacroEditorProps) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"pct" | "grams">(initialMacroMode === "gram_based" ? "grams" : "pct");
  const [fat, setFat] = useState(fat_pct);
  const [protein, setProtein] = useState(protein_pct);
  const [carbs, setCarbs] = useState(carbs_pct);
  const [carbLimit, setCarbLimit] = useState(carb_limit_grams);

  // Gram-mode direct values (independent of calorie conversion)
  const [fatG, setFatG] = useState(initialFatGrams ?? 0);
  const [proteinG, setProteinG] = useState(initialProteinGrams ?? 0);
  const [carbG, setCarbG] = useState(initialCarbGrams ?? 0);

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

  // Convert % to grams (for display in pct mode)
  const fatGramsCalc = Math.round((fat / 100) * calories / 9);
  const proteinGramsCalc = Math.round((protein / 100) * calories / 4);
  const carbsGramsCalc = Math.round((carbs / 100) * calories / 4);

  // Sync from props when they change
  useEffect(() => {
    setFat(fat_pct);
    setProtein(protein_pct);
    setCarbs(carbs_pct);
    setCarbLimit(carb_limit_grams);
    setFatG(initialFatGrams ?? 0);
    setProteinG(initialProteinGrams ?? 0);
    setCarbG(initialCarbGrams ?? 0);
    setMode(initialMacroMode === "gram_based" ? "grams" : "pct");
  }, [fat_pct, protein_pct, carbs_pct, carb_limit_grams, initialMacroMode, initialFatGrams, initialProteinGrams, initialCarbGrams]);

  const saveMutation = useMutation({
    mutationFn: async (vals: {
      fat_pct: number; protein_pct: number; carbs_pct: number;
      carb_limit_grams: number | null;
      macro_mode: string;
      fat_grams: number | null; protein_grams: number | null; carb_grams: number | null;
    }) => {
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
        const isGramBased = vals.macro_mode === "gram_based";

        for (const a of assignments) {
          const { data: mt } = await supabase
            .from("client_macro_targets")
            .select("id, target_calories")
            .eq("client_id", a.client_id)
            .eq("is_active", true)
            .maybeSingle();

          if (mt) {
            const cal = mt.target_calories || 2000;
            const updatePayload = isGramBased
              ? {
                  target_fats: vals.fat_grams ?? Math.round((vals.fat_pct / 100) * cal / 9),
                  target_protein: vals.protein_grams ?? Math.round((vals.protein_pct / 100) * cal / 4),
                  target_carbs: vals.carb_grams ?? Math.round((vals.carbs_pct / 100) * cal / 4),
                  tracking_option: "grams" as const,
                  diet_style: "keto",
                }
              : {
                  target_fats: Math.round((vals.fat_pct / 100) * cal / 9),
                  target_protein: Math.round((vals.protein_pct / 100) * cal / 4),
                  target_carbs: Math.round((vals.carbs_pct / 100) * cal / 4),
                  tracking_option: "percentage" as const,
                  diet_style: "keto",
                };

            await supabase
              .from("client_macro_targets")
              .update(updatePayload)
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
      toast.success("Macros updated — client targets synced");
    },
    onError: () => toast.error("Failed to update macros"),
  });

  const total = fat + protein + carbs;
  const isGrams = mode === "grams";

  // Debounced auto-save
  useEffect(() => {
    const timer = setTimeout(() => {
      const macroModeVal = isGrams ? "gram_based" : "percentage_based";
      const changed = fat !== fat_pct || protein !== protein_pct || carbs !== carbs_pct
        || carbLimit !== carb_limit_grams
        || macroModeVal !== (initialMacroMode || "percentage_based")
        || fatG !== (initialFatGrams ?? 0) || proteinG !== (initialProteinGrams ?? 0) || carbG !== (initialCarbGrams ?? 0);
      if (changed) {
        saveMutation.mutate({
          fat_pct: fat, protein_pct: protein, carbs_pct: carbs,
          carb_limit_grams: carbLimit,
          macro_mode: macroModeVal,
          fat_grams: fatG || null, protein_grams: proteinG || null, carb_grams: carbG || null,
        });
      }
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fat, protein, carbs, carbLimit, isGrams, fatG, proteinG, carbG]);

  // Gram mode: convert grams back to percentages (for pct mode toggle)
  const setFatFromGrams = (g: number) => {
    setFatG(g);
    setFat(Math.round((g * 9 / calories) * 100));
  };
  const setProteinFromGrams = (g: number) => {
    setProteinG(g);
    setProtein(Math.round((g * 4 / calories) * 100));
  };
  const setCarbsFromGrams = (g: number) => {
    setCarbG(g);
    setCarbs(Math.round((g * 4 / calories) * 100));
  };

  // When switching TO gram mode, initialize gram values from current %
  const handleModeSwitch = (newMode: "pct" | "grams") => {
    if (newMode === "grams" && mode === "pct") {
      setFatG(fatGramsCalc);
      setProteinG(proteinGramsCalc);
      setCarbG(carbsGramsCalc);
    }
    setMode(newMode);
  };

  const displayFatG = isGrams ? fatG : fatGramsCalc;
  const displayProteinG = isGrams ? proteinG : proteinGramsCalc;
  const displayCarbG = isGrams ? carbG : carbsGramsCalc;

  const maxPct = Math.max(fat, protein, carbs, 1);
  const maxGrams = Math.max(displayFatG, displayProteinG, displayCarbG, 1);

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
            <div className="flex rounded-md border overflow-hidden">
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 px-2.5 rounded-none text-[10px] font-bold ${mode === "pct" ? "bg-muted" : ""}`}
                onClick={() => handleModeSwitch("pct")}
              >
                <Percent className="h-3 w-3 mr-1" />
                %
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 px-2.5 rounded-none text-[10px] font-bold ${mode === "grams" ? "bg-muted" : ""}`}
                onClick={() => handleModeSwitch("grams")}
              >
                <Scale className="h-3 w-3 mr-1" />
                g
              </Button>
            </div>
            {!isGrams && (
              <span className={`text-xs font-medium ${total === 100 ? "text-green-600" : "text-destructive"}`}>
                {total}%
              </span>
            )}
          </div>
        </div>

        {/* Mode indicator */}
        <div className="text-[10px] text-muted-foreground bg-muted/50 rounded px-2 py-1 flex items-center gap-1">
          <Globe className="h-3 w-3" />
          <span>
            {isGrams
              ? <>Direct gram targets — <strong>applied globally</strong> to all assigned clients</>
              : <>Percentage mode — grams auto-calculated from each client's calorie target ({calories} cal ref)</>
            }
          </span>
        </div>

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
                    value={fatG}
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
                  <span className="text-[10px] text-muted-foreground ml-1">({fatGramsCalc}g)</span>
                </>
              )}
            </div>
          </div>
          <Slider
            value={[isGrams ? fatG : fat]}
            onValueChange={([v]) => isGrams ? setFatFromGrams(v) : setFat(v)}
            max={isGrams ? 300 : 100}
            step={1}
            className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
          />
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${isGrams ? (displayFatG / maxGrams) * 100 : (fat / maxPct) * 100}%`,
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
                    value={proteinG}
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
                  <span className="text-[10px] text-muted-foreground ml-1">({proteinGramsCalc}g)</span>
                </>
              )}
            </div>
          </div>
          <Slider
            value={[isGrams ? proteinG : protein]}
            onValueChange={([v]) => isGrams ? setProteinFromGrams(v) : setProtein(v)}
            max={isGrams ? 400 : 100}
            step={1}
            className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
          />
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${isGrams ? (displayProteinG / maxGrams) * 100 : (protein / maxPct) * 100}%`,
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
                    value={carbG}
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
                  <span className="text-[10px] text-muted-foreground ml-1">({carbsGramsCalc}g)</span>
                </>
              )}
            </div>
          </div>
          <Slider
            value={[isGrams ? carbG : carbs]}
            onValueChange={([v]) => isGrams ? setCarbsFromGrams(v) : setCarbs(v)}
            max={isGrams ? 200 : 100}
            step={1}
            className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
          />
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${isGrams ? (displayCarbG / maxGrams) * 100 : (carbs / maxPct) * 100}%`,
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
