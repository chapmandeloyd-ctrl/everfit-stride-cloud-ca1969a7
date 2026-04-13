import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Bell, Flame, Timer, Utensils, Moon, Target, Trophy } from "lucide-react";
import { useHabitLoopPreferences } from "@/hooks/useHabitLoopPreferences";
import { Skeleton } from "@/components/ui/skeleton";

const NOTIFICATION_TYPES = [
  { key: "pre_window_enabled", label: "Pre-Window Alert", desc: "15 min before window opens", icon: Timer },
  { key: "break_fast_enabled", label: "Break Fast Moment", desc: "When your window opens", icon: Utensils },
  { key: "mid_window_enabled", label: "Mid-Window Check", desc: "Halfway through window", icon: Target },
  { key: "last_meal_enabled", label: "Last Meal Alert", desc: "60–90 min before close", icon: Moon },
  { key: "streak_protection_enabled", label: "Streak Protection", desc: "When streak is at risk", icon: Flame },
  { key: "daily_score_enabled", label: "Daily Score", desc: "End-of-day feedback", icon: Trophy },
] as const;

export function HabitLoopSettings() {
  const { prefs, isLoading, updatePrefs } = useHabitLoopPreferences();

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  if (!prefs) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-5 w-5 text-primary" />
          Habit Loop Notifications
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Smart alerts that keep you on track throughout the day
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Max daily slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Max daily alerts</Label>
            <span className="text-sm font-semibold text-primary">
              {prefs.max_daily_notifications}
            </span>
          </div>
          <Slider
            value={[prefs.max_daily_notifications]}
            onValueChange={([v]) => updatePrefs({ max_daily_notifications: v })}
            min={1}
            max={6}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Recommended: 3 alerts per day
          </p>
        </div>

        {/* Smart reduce toggle */}
        <div className="flex items-center justify-between py-2 border-t border-border">
          <div>
            <Label className="text-sm">Smart Frequency</Label>
            <p className="text-xs text-muted-foreground">
              Reduce alerts if you're not engaging
            </p>
          </div>
          <Switch
            checked={prefs.reduce_if_ignored}
            onCheckedChange={(v) => updatePrefs({ reduce_if_ignored: v })}
          />
        </div>

        {/* Notification type toggles */}
        <div className="space-y-1 border-t border-border pt-4">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Alert Types</Label>
          {NOTIFICATION_TYPES.map(({ key, label, desc, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
              <Switch
                checked={(prefs as any)[key] ?? true}
                onCheckedChange={(v) => updatePrefs({ [key]: v })}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
