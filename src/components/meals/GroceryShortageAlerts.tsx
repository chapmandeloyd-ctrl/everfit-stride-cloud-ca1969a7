import { AlertTriangle } from "lucide-react";

interface Props {
  lowStockItems: { ingredient_name: string; amount: string | null; used_amount: string | null }[];
}

export function GroceryShortageAlerts({ lowStockItems }: Props) {
  if (lowStockItems.length === 0) return null;

  return (
    <div className="mx-5 mb-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <span className="text-xs font-bold text-destructive">Running Low</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {lowStockItems.slice(0, 6).map((item) => (
          <span
            key={item.ingredient_name}
            className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium"
          >
            {item.ingredient_name}
          </span>
        ))}
        {lowStockItems.length > 6 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            +{lowStockItems.length - 6} more
          </span>
        )}
      </div>
    </div>
  );
}
