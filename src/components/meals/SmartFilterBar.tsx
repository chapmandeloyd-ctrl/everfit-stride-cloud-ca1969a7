import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const FILTERS = [
  { key: "high_protein", label: "High Protein", emoji: "💪" },
  { key: "quick", label: "Quick Meals", emoji: "⚡" },
  { key: "light", label: "Light Meal", emoji: "🥗" },
  { key: "heavy", label: "Heavy Meal", emoji: "🍖" },
  { key: "break_fast_safe", label: "Break Fast Safe", emoji: "🌅" },
  { key: "last_meal_control", label: "Last Meal Control", emoji: "🌙" },
] as const;

export type SmartFilter = (typeof FILTERS)[number]["key"];

interface SmartFilterBarProps {
  active: SmartFilter | null;
  onSelect: (filter: SmartFilter | null) => void;
}

export function SmartFilterBar({ active, onSelect }: SmartFilterBarProps) {
  return (
    <div className="px-5 pb-3">
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => onSelect(active === f.key ? null : f.key)}
              className={cn(
                "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95",
                active === f.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-foreground hover:border-primary/40"
              )}
            >
              <span>{f.emoji}</span>
              {f.label}
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
