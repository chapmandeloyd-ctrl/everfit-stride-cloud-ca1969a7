import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface KetoMacroEditorProps {
  ketoTypeId: string;
  fat_pct: number;
  protein_pct: number;
  carbs_pct: number;
  carb_limit_grams: number | null;
  color: string;
  abbreviation: string;
}

export function KetoMacroEditor({
  ketoTypeId,
  fat_pct,
  protein_pct,
  carbs_pct,
  carb_limit_grams,
  color,
  abbreviation,
}: KetoMacroEditorProps) {
  const queryClient = useQueryClient();
  const [fat, setFat] = useState(fat_pct);
  const [protein, setProtein] = useState(protein_pct);
  const [carbs, setCarbs] = useState(carbs_pct);
  const [carbLimit, setCarbLimit] = useState(carb_limit_grams);

  // Sync from props when they change (e.g. different keto type selected)
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

      // Auto-sync: recalculate gram targets for all clients on this keto type
      const { data: assignments } = await supabase
        .from("client_keto_assignments")
        .select("client_id")
        .eq("keto_type_id", ketoTypeId)
        .eq("is_active", true);

      if (assignments && assignments.length > 0) {
        for (const a of assignments) {
          const { data: macroTarget } = await supabase
            .from("client_macro_targets")
            .select("id, target_calories")
            .eq("client_id", a.client_id)
            .eq("is_active", true)
            .maybeSingle();

          if (macroTarget?.target_calories) {
            const cal = macroTarget.target_calories;
            // Fat: 9 cal/g, Protein: 4 cal/g, Carbs: 4 cal/g
            const newFats = Math.round((vals.fat_pct / 100) * cal / 9);
            const newProtein = Math.round((vals.protein_pct / 100) * cal / 4);
            const newCarbs = Math.round((vals.carbs_pct / 100) * cal / 4);

            await supabase
              .from("client_macro_targets")
              .update({
                target_fats: newFats,
                target_protein: newProtein,
                target_carbs: newCarbs,
                diet_style: "keto",
              })
              .eq("id", macroTarget.id);
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

  const maxPct = Math.max(fat, protein, carbs);

  return (
    <Card className="border" style={{ borderColor: `${color}30` }}>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-black" style={{ color }}>{abbreviation}</span>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Macro Editor</span>
          </div>
          <span className={`text-xs font-medium ${total === 100 ? "text-green-600" : "text-destructive"}`}>
            Total: {total}%
          </span>
        </div>

        {/* Fat */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Fat</Label>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                className="h-7 w-14 text-xs text-center"
                value={fat}
                onChange={(e) => setFat(Math.max(0, Math.min(100, +e.target.value)))}
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>
          <Slider
            value={[fat]}
            onValueChange={([v]) => setFat(v)}
            max={100}
            step={1}
            className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
          />
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${(fat / maxPct) * 100}%`, backgroundColor: color }} />
          </div>
        </div>

        {/* Protein */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Protein</Label>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                className="h-7 w-14 text-xs text-center"
                value={protein}
                onChange={(e) => setProtein(Math.max(0, Math.min(100, +e.target.value)))}
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>
          <Slider
            value={[protein]}
            onValueChange={([v]) => setProtein(v)}
            max={100}
            step={1}
            className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
          />
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${(protein / maxPct) * 100}%`, backgroundColor: "#94a3b8" }} />
          </div>
        </div>

        {/* Carbs */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Carbs</Label>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                className="h-7 w-14 text-xs text-center"
                value={carbs}
                onChange={(e) => setCarbs(Math.max(0, Math.min(100, +e.target.value)))}
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>
          <Slider
            value={[carbs]}
            onValueChange={([v]) => setCarbs(v)}
            max={100}
            step={1}
            className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
          />
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${(carbs / maxPct) * 100}%`, backgroundColor: "#475569" }} />
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
