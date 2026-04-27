import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GlassWater, Check } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const OZ_PER_LITER = 33.814;
const ozToLiter = (oz: number) => oz / OZ_PER_LITER;
const literToOz = (l: number) => l * OZ_PER_LITER;

export type WaterUnit = "fl_oz" | "liter";
export type WaterPortion = "glass" | "bottle";
export const WATER_PORTION_OZ: Record<WaterPortion, number> = { glass: 8, bottle: 16 };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null | undefined;
  /** When provided and the Reminders switch changes, this fires after a successful save */
  onRemindersChange?: (enabled: boolean) => void;
  currentRemindersEnabled?: boolean;
  context?: "client" | "admin";
}

export function WaterTrackerSettingsDialog({
  open,
  onOpenChange,
  clientId,
  onRemindersChange,
  currentRemindersEnabled,
  context = "client",
}: Props) {
  const queryClient = useQueryClient();
  const [draftUnit, setDraftUnit] = useState<WaterUnit>("fl_oz");
  const [draftPortion, setDraftPortion] = useState<WaterPortion>("glass");
  const [draftGoalOz, setDraftGoalOz] = useState<number>(64);
  const [draftReminders, setDraftReminders] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["water-goal-settings", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data } = await supabase
        .from("water_goal_settings")
        .select("daily_goal_oz, serving_size_oz, unit, reminders_enabled")
        .eq("client_id", clientId)
        .maybeSingle();
      return (
        data ?? {
          daily_goal_oz: 64,
          serving_size_oz: 8,
          unit: "fl_oz",
          reminders_enabled: true,
        }
      );
    },
    enabled: !!clientId && open,
  });

  useEffect(() => {
    if (!open || !settings) return;
    const goalOz = Number(settings.daily_goal_oz ?? 64);
    const servingOz = Number(settings.serving_size_oz ?? 8);
    setDraftUnit((settings.unit as WaterUnit) ?? "fl_oz");
    setDraftPortion(servingOz >= 12 ? "bottle" : "glass");
    setDraftGoalOz(goalOz);
    setDraftReminders(currentRemindersEnabled ?? settings.reminders_enabled ?? true);
  }, [open, settings, currentRemindersEnabled]);

  const sliderMinOz = draftUnit === "liter" ? Math.round(literToOz(0.5)) : 16;
  const sliderMaxOz = draftUnit === "liter" ? Math.round(literToOz(5)) : 200;
  const sliderStepOz = draftUnit === "liter" ? Math.round(literToOz(0.1)) : 8;
  const draftGoalDisplay =
    draftUnit === "liter"
      ? `${ozToLiter(draftGoalOz).toFixed(2)} L`
      : `${Math.round(draftGoalOz)} fl oz`;
  const portionDisplay = (oz: number) =>
    draftUnit === "liter" ? `${ozToLiter(oz).toFixed(2)} L` : `${oz} fl oz`;
  const bottleCount = Math.round(draftGoalOz / WATER_PORTION_OZ[draftPortion]);

  const handleSave = async () => {
    if (!clientId) return;
    setSaving(true);
    const goal = Math.round(draftGoalOz);
    const serving = WATER_PORTION_OZ[draftPortion];

    const { error } = await supabase
      .from("water_goal_settings")
      .upsert(
        {
          client_id: clientId,
          daily_goal_oz: goal,
          serving_size_oz: serving,
          unit: draftUnit,
          reminders_enabled: draftReminders,
        },
        { onConflict: "client_id" },
      );
    setSaving(false);
    if (error) {
      toast.error("Couldn't save");
      return;
    }
    if (onRemindersChange && currentRemindersEnabled !== draftReminders) {
      try {
        onRemindersChange(draftReminders);
      } catch {
        /* non-fatal */
      }
    }
    toast.success(
      context === "admin" ? "Client water tracker updated" : "Water tracker updated",
    );
    onOpenChange(false);
    queryClient.invalidateQueries({ queryKey: ["water-goal-settings", clientId] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Water Tracker Settings
            {context === "admin" && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (Admin view)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground">Portion</div>
            <div className="grid grid-cols-2 gap-3">
              {(["glass", "bottle"] as WaterPortion[]).map((p) => {
                const selected = draftPortion === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setDraftPortion(p)}
                    className={cn(
                      "relative rounded-2xl border-2 p-4 flex flex-col items-center gap-2 transition-all",
                      selected
                        ? "border-sky-400 bg-sky-400/10"
                        : "border-border bg-secondary/30 hover:bg-secondary/50",
                    )}
                  >
                    {selected && (
                      <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" strokeWidth={3} />
                      </div>
                    )}
                    {p === "glass" ? (
                      <GlassWater className="h-10 w-10 text-sky-400" strokeWidth={1.5} />
                    ) : (
                      <svg
                        viewBox="0 0 24 32"
                        className="h-10 w-10 text-sky-400"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        {/* Cap */}
                        <rect x="9" y="1.5" width="6" height="3" rx="0.8" />
                        {/* Neck */}
                        <path d="M10 4.5 V8" />
                        <path d="M14 4.5 V8" />
                        {/* Shoulder + body */}
                        <path d="M10 8 Q6 10 6 14 V27 Q6 30 9 30 H15 Q18 30 18 27 V14 Q18 10 14 8 Z" />
                        {/* Water fill */}
                        <path
                          d="M6.4 17 V27 Q6.4 29.6 9 29.6 H15 Q17.6 29.6 17.6 27 V17 Z"
                          fill="currentColor"
                          fillOpacity={0.3}
                          stroke="none"
                        />
                      </svg>
                    )}
                    <div className="text-center">
                      <div className="text-base font-semibold capitalize">{p}</div>
                      <div className="text-xs text-muted-foreground">
                        {portionDisplay(WATER_PORTION_OZ[p])}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  {context === "admin" ? "Client's Daily Goal" : "Your Daily Goal"}
                </div>
                <div className="text-xs text-muted-foreground/80">
                  Equals {bottleCount} {draftPortion}
                  {bottleCount === 1 ? "" : "s"} (1 {draftPortion} ={" "}
                  {portionDisplay(WATER_PORTION_OZ[draftPortion])})
                </div>
              </div>
              <div className="text-lg font-bold text-foreground">{draftGoalDisplay}</div>
            </div>

            <Slider
              value={[draftGoalOz]}
              min={sliderMinOz}
              max={sliderMaxOz}
              step={sliderStepOz}
              onValueChange={(v) => setDraftGoalOz(v[0])}
              className="py-2"
            />

            <div className="flex gap-2 pt-1">
              {(["fl_oz", "liter"] as WaterUnit[]).map((u) => {
                const selected = draftUnit === u;
                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setDraftUnit(u)}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-sm font-semibold transition-all",
                      selected
                        ? "bg-foreground text-background"
                        : "bg-secondary/50 text-muted-foreground hover:bg-secondary",
                    )}
                  >
                    {u === "fl_oz" ? "fl oz" : "L"}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border/60 pt-4">
            <div>
              <div className="text-sm font-medium text-foreground">Reminders</div>
              <div className="text-xs text-muted-foreground">
                Hydration nudges throughout the day
              </div>
            </div>
            <Switch checked={draftReminders} onCheckedChange={setDraftReminders} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-emerald-500 hover:text-emerald-400"
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default WaterTrackerSettingsDialog;