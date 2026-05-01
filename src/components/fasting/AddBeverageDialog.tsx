import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Camera, Barcode, Pencil, Loader2, Sparkles } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { BarcodeScannerDialog } from "@/components/BarcodeScannerDialog";
import { FoodPhotoAnalyzerDialog } from "@/components/FoodPhotoAnalyzerDialog";
import type { BeverageCategoryKey } from "@/lib/beverageCategories";
import { ALL_CATEGORIES } from "@/lib/beverageCategories";

const schema = z.object({
  name: z.string().trim().min(1, "Name required").max(80),
  calories: z.number().min(0).max(2000),
  protein: z.number().min(0).max(500),
  carbs: z.number().min(0).max(500),
  fats: z.number().min(0).max(500),
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string;
  category: BeverageCategoryKey;
}

export function AddBeverageDialog({ open, onOpenChange, clientId, category }: Props) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"choose" | "ai" | "manual">("choose");
  const [showBarcode, setShowBarcode] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ name: "", calories: 0, protein: 0, carbs: 0, fats: 0, source: "manual" as "manual" | "photo" | "barcode", barcode: "" });
  const [details, setDetails] = useState<Record<string, any>>({});

  const reset = () => {
    setMode("choose");
    setAiQuery("");
    setForm({ name: "", calories: 0, protein: 0, carbs: 0, fats: 0, source: "manual", barcode: "" });
    setDetails({});
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleAiLookup = async () => {
    const q = aiQuery.trim();
    if (!q) {
      toast.error("Type a beverage name");
      return;
    }
    setAiLoading(true);
    const { data, error } = await supabase.functions.invoke("ai-beverage-lookup", {
      body: { name: q, category: ALL_CATEGORIES[category]?.label },
    });
    setAiLoading(false);
    if (error || !data?.nutrition) {
      toast.error(error?.message || "AI lookup failed");
      return;
    }
    const n = data.nutrition;
    setForm({
      name: n.name || q,
      calories: Math.round(n.calories || 0),
      protein: Math.round((n.protein || 0) * 10) / 10,
      carbs: Math.round((n.carbs || 0) * 10) / 10,
      fats: Math.round((n.fats || 0) * 10) / 10,
      source: "manual",
      barcode: "",
    });
    setDetails({
      serving: n.serving || null,
      electrolytes: n.electrolytes || {},
      caffeine_mg: n.caffeine_mg ?? 0,
      sugar_g: n.sugar_g ?? 0,
      added_sugar_g: n.added_sugar_g ?? 0,
      fiber_g: n.fiber_g ?? 0,
      vitamins: n.vitamins || [],
      aminos: n.aminos || [],
      other: n.other || [],
    });
    toast.success(`Found: ${n.name}${n.serving ? ` (${n.serving})` : ""}`);
    setMode("manual");
  };

  const handleSave = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("client_beverages").insert({
      client_id: clientId,
      name: form.name.trim(),
      category,
      calories: form.calories,
      protein: form.protein,
      carbs: form.carbs,
      fats: form.fats,
      source: form.source,
      barcode: form.barcode || null,
      details,
    });
    setSaving(false);
    if (error) {
      toast.error("Failed to save");
      return;
    }
    toast.success("Beverage saved");
    qc.invalidateQueries({ queryKey: ["client-beverages", clientId] });
    handleClose(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to {ALL_CATEGORIES[category].label}</DialogTitle>
            <DialogDescription>Save your favorite to log with one tap.</DialogDescription>
          </DialogHeader>

          {mode === "choose" && (
            <div className="grid gap-3 mt-2">
              <Button variant="outline" className="h-14 justify-start gap-3" onClick={() => setMode("ai")}>
                <Sparkles className="h-5 w-5" /> Type name — AI fills nutrition
              </Button>
              <Button variant="outline" className="h-14 justify-start gap-3" onClick={() => setMode("manual")}>
                <Pencil className="h-5 w-5" /> Type it in manually
              </Button>
              <Button variant="outline" className="h-14 justify-start gap-3" onClick={() => setShowPhoto(true)}>
                <Camera className="h-5 w-5" /> Snap a photo
              </Button>
              <Button variant="outline" className="h-14 justify-start gap-3" onClick={() => setShowBarcode(true)}>
                <Barcode className="h-5 w-5" /> Scan barcode
              </Button>
            </div>
          )}

          {mode === "ai" && (
            <div className="space-y-3 mt-2">
              <div>
                <Label htmlFor="ai-name">Beverage name</Label>
                <Input
                  id="ai-name"
                  autoFocus
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !aiLoading) handleAiLookup(); }}
                  placeholder="e.g. Zero Pepsi, Celsius Peach, Xtend BCAA"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  AI will look up calories & macros for one standard serving. You can edit before saving.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setMode("choose")} disabled={aiLoading}>Back</Button>
                <Button className="flex-1" onClick={handleAiLookup} disabled={aiLoading}>
                  {aiLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Looking up…</> : <><Sparkles className="h-4 w-4 mr-2" /> Look up</>}
                </Button>
              </div>
            </div>
          )}

          {mode === "manual" && (
            <div className="space-y-3 mt-2">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Diet Coke" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="cal">Calories</Label>
                  <Input id="cal" type="number" inputMode="decimal" value={form.calories} onChange={(e) => setForm({ ...form, calories: Number(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label htmlFor="protein">Protein (g)</Label>
                  <Input id="protein" type="number" inputMode="decimal" value={form.protein} onChange={(e) => setForm({ ...form, protein: Number(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label htmlFor="carbs">Carbs (g)</Label>
                  <Input id="carbs" type="number" inputMode="decimal" value={form.carbs} onChange={(e) => setForm({ ...form, carbs: Number(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label htmlFor="fats">Fats (g)</Label>
                  <Input id="fats" type="number" inputMode="decimal" value={form.fats} onChange={(e) => setForm({ ...form, fats: Number(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setMode("choose")}>Back</Button>
                <Button className="flex-1" onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BarcodeScannerDialog
        open={showBarcode}
        onOpenChange={setShowBarcode}
        onProductScanned={(p) => {
          setForm({ name: p.name, calories: p.calories, protein: p.protein, carbs: p.carbs, fats: p.fats, source: "barcode", barcode: "" });
          setMode("manual");
        }}
      />

      <FoodPhotoAnalyzerDialog
        open={showPhoto}
        onOpenChange={setShowPhoto}
        onAnalysisComplete={(p) => {
          setForm({ name: p.name, calories: p.calories, protein: p.protein, carbs: p.carbs, fats: p.fats, source: "photo", barcode: "" });
          setMode("manual");
        }}
      />
    </>
  );
}
