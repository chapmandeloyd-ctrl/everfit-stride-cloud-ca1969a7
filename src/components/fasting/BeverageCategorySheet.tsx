import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, GlassWater, Loader2, Info } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { BeverageCategoryKey } from "@/lib/beverageCategories";
import { ALL_CATEGORIES } from "@/lib/beverageCategories";
import { AddBeverageDialog } from "./AddBeverageDialog";
import { BeverageLabelView } from "./BeverageLabelView";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category: BeverageCategoryKey;
  clientId: string;
  activeFastStartAt?: string | null;
}

export function BeverageCategorySheet({ open, onOpenChange, category, clientId, activeFastStartAt }: Props) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [labelView, setLabelView] = useState<any>(null);

  const { data: beverages = [], isLoading } = useQuery({
    queryKey: ["client-beverages", clientId, category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_beverages")
        .select("*")
        .eq("client_id", clientId)
        .eq("category", category)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: open && !!clientId,
  });

  const logMutation = useMutation({
    mutationFn: async (b: any) => {
      const isActiveFast = !!activeFastStartAt;
      const breaksFast = isActiveFast && Number(b.calories) >= 50;
      if (breaksFast) {
        const ok = window.confirm(
          `${b.name} has ${Math.round(b.calories)} cal. This will break your fast. Log it anyway?`
        );
        if (!ok) return null;
      }
      const { error } = await supabase.from("beverage_logs").insert({
        client_id: clientId,
        beverage_id: b.id,
        name: b.name,
        category: b.category,
        calories: b.calories,
        protein: b.protein,
        carbs: b.carbs,
        fats: b.fats,
        broke_fast: breaksFast,
        details: b.details || {},
      });
      if (error) throw error;

      // Track on activity timeline
      const cal = Math.round(Number(b.calories) || 0);
      const subtitleParts = [`${cal} cal`];
      if (breaksFast) subtitleParts.push("fast broken");
      const cfg = ALL_CATEGORIES[b.category as BeverageCategoryKey];
      if (cfg) subtitleParts.push(cfg.label);
      await supabase.from("activity_events").insert({
        client_id: clientId,
        event_type: "beverage_logged",
        category: "eating",
        title: b.name,
        subtitle: subtitleParts.join(" · "),
        icon: "coffee",
        metadata: {
          beverage_id: b.id,
          category: b.category,
          calories: cal,
          broke_fast: breaksFast,
          during_fast: isActiveFast,
        },
        source: "client",
      });

      return { breaksFast };
    },
    onSuccess: (res) => {
      if (!res) return;
      qc.invalidateQueries({ queryKey: ["beverage-logs-today", clientId] });
      qc.invalidateQueries({ queryKey: ["activity-events", clientId] });
      toast.success(res.breaksFast ? "Logged — fast broken" : "Logged");
    },
    onError: () => toast.error("Failed to log"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_beverages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-beverages", clientId, category] }),
  });

  const cfg = ALL_CATEGORIES[category];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle className="text-2xl font-black flex items-center gap-2">
              <span className="text-2xl">{cfg.emoji}</span> {cfg.label}
            </SheetTitle>
            <SheetDescription>Tap a drink to log it</SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-2 pb-6">
            {isLoading ? (
              <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : beverages.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No saved drinks yet.
              </div>
            ) : (
              beverages.map((b: any) => (
                <div key={b.id} className="flex items-center gap-2 rounded-xl border bg-card p-3">
                  <button
                    type="button"
                    onClick={() => logMutation.mutate(b)}
                    disabled={logMutation.isPending}
                    className="flex-1 text-left flex items-center gap-3 min-w-0"
                  >
                    <GlassWater className="h-5 w-5 text-sky-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{b.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(Number(b.calories))} cal · P {Number(b.protein)}g · C {Number(b.carbs)}g · F {Number(b.fats)}g
                      </p>
                    </div>
                  </button>
                  {b.details && Object.keys(b.details).length > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); setLabelView(b); }}
                      aria-label="View label"
                    >
                      <Info className="h-4 w-4 text-sky-400" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(b.id)}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))
            )}

            <Button
              variant="outline"
              className="w-full h-12 mt-3 gap-2"
              onClick={() => setShowAdd(true)}
            >
              <Plus className="h-4 w-4" /> Add a drink
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AddBeverageDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        clientId={clientId}
        category={category}
      />

      <Dialog open={!!labelView} onOpenChange={(v) => !v && setLabelView(null)}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          {labelView && (
            <>
              <DialogHeader>
                <DialogTitle>{labelView.name}</DialogTitle>
                <DialogDescription>
                  {Math.round(Number(labelView.calories))} cal · P {Number(labelView.protein)}g · C {Number(labelView.carbs)}g · F {Number(labelView.fats)}g
                </DialogDescription>
              </DialogHeader>
              <BeverageLabelView details={labelView.details} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
