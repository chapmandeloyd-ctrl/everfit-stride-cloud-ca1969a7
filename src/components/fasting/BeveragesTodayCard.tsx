import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GlassWater, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  clientId: string;
}

export function BeveragesTodayCard({ clientId }: Props) {
  const qc = useQueryClient();

  const { data: logs = [] } = useQuery({
    queryKey: ["beverage-logs-today", clientId],
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("beverage_logs")
        .select("*")
        .eq("client_id", clientId)
        .gte("consumed_at", start.toISOString())
        .order("consumed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId,
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("beverage_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["beverage-logs-today", clientId] });
      toast.success("Removed");
    },
  });

  if (logs.length === 0) return null;

  const totalCal = logs.reduce((s: number, l: any) => s + Number(l.calories || 0), 0);
  const broke = logs.some((l: any) => l.broke_fast);

  // Aggregate electrolyte + caffeine totals from details JSON
  const totals = logs.reduce(
    (acc: any, l: any) => {
      const d = l.details || {};
      const e = d.electrolytes || {};
      acc.sodium += Number(e.sodium_mg) || 0;
      acc.potassium += Number(e.potassium_mg) || 0;
      acc.magnesium += Number(e.magnesium_mg) || 0;
      acc.caffeine += Number(d.caffeine_mg) || 0;
      return acc;
    },
    { sodium: 0, potassium: 0, magnesium: 0, caffeine: 0 }
  );
  const hasElec = totals.sodium || totals.potassium || totals.magnesium || totals.caffeine;

  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-sm p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GlassWater className="h-4 w-4 text-sky-300" />
          <span className="text-sm font-semibold text-white">Beverages today</span>
        </div>
        <span className={`text-xs font-bold ${broke ? "text-red-400" : "text-white/70"}`}>
          {Math.round(totalCal)} cal {broke && "· fast broken"}
        </span>
      </div>
      <div className="space-y-1">
        {logs.map((l: any) => (
          <div key={l.id} className="flex items-center justify-between gap-2 text-xs text-white/80">
            <span className="truncate flex-1">{l.name}</span>
            <span className="text-white/50 shrink-0">{Math.round(Number(l.calories))} cal</span>
            <button
              type="button"
              onClick={() => removeMutation.mutate(l.id)}
              className="text-white/40 hover:text-white/80"
              aria-label="Remove"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      {hasElec ? (
        <div className="pt-2 border-t border-white/10 flex flex-wrap gap-1.5">
          {totals.sodium > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-semibold text-white/90">
              Na {Math.round(totals.sodium)}mg
            </span>
          )}
          {totals.potassium > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-semibold text-white/90">
              K {Math.round(totals.potassium)}mg
            </span>
          )}
          {totals.magnesium > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-semibold text-white/90">
              Mg {Math.round(totals.magnesium)}mg
            </span>
          )}
          {totals.caffeine > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-[10px] font-semibold text-amber-200">
              ☕ {Math.round(totals.caffeine)}mg
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}
