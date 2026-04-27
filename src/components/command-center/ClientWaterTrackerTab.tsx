import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings2, Droplet } from "lucide-react";
import { WaterTrackerSettingsDialog } from "@/components/water/WaterTrackerSettingsDialog";

interface Props {
  clientId: string;
}

const OZ_PER_LITER = 33.814;
const formatVolume = (oz: number, unit: "fl_oz" | "liter") =>
  unit === "liter" ? `${(oz / OZ_PER_LITER).toFixed(2)} L` : `${Math.round(oz)} fl oz`;

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function ClientWaterTrackerTab({ clientId }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["water-goal-settings", clientId],
    queryFn: async () => {
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
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["water-log-today", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("water_log_entries")
        .select("amount_oz")
        .eq("client_id", clientId)
        .gte("logged_at", startOfTodayISO());
      return data ?? [];
    },
  });

  // Trainer's view of the client's habit-loop hydration toggle
  const { data: habitPrefs } = useQuery({
    queryKey: ["habit-loop-prefs", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("habit_loop_preferences")
        .select("hydration_enabled")
        .eq("client_id", clientId)
        .maybeSingle();
      return data ?? { hydration_enabled: true };
    },
  });

  const goalOz = Number(settings?.daily_goal_oz ?? 64);
  const servingOz = Number(settings?.serving_size_oz ?? 8);
  const unit = (settings?.unit as "fl_oz" | "liter") ?? "fl_oz";
  const remindersEnabled = settings?.reminders_enabled ?? true;
  const totalOz = entries.reduce((s, e) => s + Number(e.amount_oz), 0);
  const percent = goalOz > 0 ? Math.min(Math.round((totalOz / goalOz) * 100), 100) : 0;

  const handleAdminRemindersChange = async (enabled: boolean) => {
    await supabase
      .from("habit_loop_preferences")
      .upsert({ client_id: clientId, hydration_enabled: enabled }, { onConflict: "client_id" });
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
              <Droplet className="h-5 w-5 text-sky-500 fill-sky-500/30" />
            </div>
            <div>
              <div className="text-sm font-semibold">Water Tracker</div>
              <div className="text-xs text-muted-foreground">
                Configure this client's daily hydration goal
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSettingsOpen(true)}
            className="shrink-0"
          >
            <Settings2 className="h-4 w-4 mr-1" /> Configure
          </Button>
        </div>

        {/* Today's progress */}
        <div className="rounded-lg border border-border/60 bg-secondary/30 p-3 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Today's Progress
            </span>
            <span className="text-sm font-semibold">{percent}%</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-sky-400 transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="text-sm text-foreground">
            {formatVolume(totalOz, unit)}
            <span className="text-muted-foreground"> / {formatVolume(goalOz, unit)}</span>
          </div>
        </div>

        {/* Settings summary grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-border/60 p-3">
            <div className="text-xs text-muted-foreground">Portion size</div>
            <div className="font-semibold mt-0.5">
              {servingOz >= 12 ? "Bottle" : "Glass"} · {formatVolume(servingOz, unit)}
            </div>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <div className="text-xs text-muted-foreground">Unit</div>
            <div className="font-semibold mt-0.5">{unit === "liter" ? "Liters" : "fl oz"}</div>
          </div>
          <div className="rounded-lg border border-border/60 p-3 col-span-2">
            <div className="text-xs text-muted-foreground">Reminders</div>
            <div className="font-semibold mt-0.5">
              {remindersEnabled ? "On" : "Off"}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({habitPrefs?.hydration_enabled ? "habit loop active" : "habit loop muted"})
              </span>
            </div>
          </div>
        </div>
      </CardContent>

      <WaterTrackerSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        clientId={clientId}
        currentRemindersEnabled={habitPrefs?.hydration_enabled ?? remindersEnabled}
        onRemindersChange={handleAdminRemindersChange}
        context="admin"
      />
    </Card>
  );
}

export default ClientWaterTrackerTab;