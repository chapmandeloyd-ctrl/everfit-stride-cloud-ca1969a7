import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Repeat } from "lucide-react";

export interface RepeatConfig {
  frequency: "daily" | "weekly" | "monthly";
  interval: number;
  daysOfWeek: number[]; // 0=Mon, 1=Tue, ..., 6=Sun
  durationWeeks: number;
}

interface TaskRepeatSectionProps {
  config: RepeatConfig | null;
  onConfigChange: (config: RepeatConfig | null) => void;
  selectedDate?: Date;
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export function TaskRepeatSection({ config, onConfigChange, selectedDate }: TaskRepeatSectionProps) {
  const [isOpen, setIsOpen] = useState(!!config);

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
      onConfigChange(null);
    } else {
      setIsOpen(true);
      // Default: weekly on the selected day
      const dayIndex = selectedDate ? (selectedDate.getDay() + 6) % 7 : 0; // Convert Sun=0 to Mon=0
      onConfigChange({
        frequency: "weekly",
        interval: 1,
        daysOfWeek: [dayIndex],
        durationWeeks: 2,
      });
    }
  };

  const handleRemove = () => {
    setIsOpen(false);
    onConfigChange(null);
  };

  const toggleDay = (dayIndex: number) => {
    if (!config) return;
    const days = config.daysOfWeek.includes(dayIndex)
      ? config.daysOfWeek.filter(d => d !== dayIndex)
      : [...config.daysOfWeek, dayIndex].sort();
    if (days.length === 0) return; // Must have at least one day
    onConfigChange({ ...config, daysOfWeek: days });
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleToggle}
        className={`flex items-center gap-2 transition-colors ${
          isOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Repeat className="h-4 w-4" />
        <span className="text-sm font-medium">Repeat</span>
      </button>

      {isOpen && config && (
        <div className="p-4 rounded-xl bg-muted/50 space-y-4">
          {/* Row 1: Frequency + Remove */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Label className="text-sm text-muted-foreground">Frequency</Label>
              <Select
                value={config.frequency}
                onValueChange={(v) => onConfigChange({ ...config, frequency: v as any })}
              >
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Remove repeat
            </button>
          </div>

          {/* Row 2: Every X week on [days] */}
          {config.frequency === "weekly" && (
            <div className="flex items-center gap-3 flex-wrap">
              <Label className="text-sm text-muted-foreground">Every</Label>
              <Select
                value={String(config.interval)}
                onValueChange={(v) => onConfigChange({ ...config, interval: parseInt(v) })}
              >
                <SelectTrigger className="w-[70px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map(n => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label className="text-sm text-muted-foreground">week on</Label>
              <div className="flex gap-1">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                      config.daysOfWeek.includes(i)
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground border border-border hover:border-primary/50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Row 3: Duration */}
          <div className="flex items-center gap-3">
            <Label className="text-sm text-muted-foreground">For the next</Label>
            <Select
              value={String(config.durationWeeks)}
              onValueChange={(v) => onConfigChange({ ...config, durationWeeks: parseInt(v) })}
            >
              <SelectTrigger className="w-[70px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 6, 8, 12].map(n => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label className="text-sm text-muted-foreground">weeks</Label>
          </div>
        </div>
      )}
    </div>
  );
}
