import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Zap, FolderPlus } from "lucide-react";
import { KetoTypeCard } from "@/components/keto/KetoTypeCard";
import { KetoTypeDetailView } from "@/components/keto/KetoTypeDetailView";
import { KetoProtocolsTab } from "@/components/keto/KetoProtocolsTab";
import { toast } from "sonner";

interface KetoCategory {
  id: string;
  name: string;
  icon_name: string;
  color: string;
  order_index: number;
  trainer_id: string;
}

interface KetoType {
  id: string;
  abbreviation: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  fat_pct: number;
  protein_pct: number;
  carbs_pct: number;
  carb_limit_grams: number | null;
  difficulty: string;
  engine_compatibility: string;
  how_it_works: string | null;
  built_for: string[];
  coach_notes: string[];
  color: string;
  order_index: number;
  is_active: boolean;
  category_id: string;
  trainer_id: string;
}

const PRESET_COLORS = [
  "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899",
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#06b6d4", "#64748b",
];

const emptyType = {
  abbreviation: "",
  name: "",
  subtitle: "",
  description: "",
  fat_pct: 70,
  protein_pct: 25,
  carbs_pct: 5,
  carb_limit_grams: null as number | null,
  difficulty: "beginner",
  engine_compatibility: "both",
  how_it_works: "",
  built_for: [] as string[],
  coach_notes: [] as string[],
  color: "#3b82f6",
  category_id: "",
};

export default function KetoTypesManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<KetoCategory | null>(null);
  const [catForm, setCatForm] = useState({ name: "", color: "#3b82f6" });

  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<KetoType | null>(null);
  const [typeForm, setTypeForm] = useState({ ...emptyType });
  const [builtForInput, setBuiltForInput] = useState("");
  const [coachNoteInput, setCoachNoteInput] = useState("");
  const [viewingType, setViewingType] = useState<KetoType | null>(null);

  const { data: categories } = useQuery({
    queryKey: ["trainer-keto-categories", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("keto_categories")
        .select("*")
        .eq("trainer_id", user!.id)
        .order("order_index");
      if (error) throw error;
      return data as KetoCategory[];
    },
    enabled: !!user,
  });

  const { data: ketoTypes } = useQuery({
    queryKey: ["trainer-keto-types", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("keto_types")
        .select("*")
        .eq("trainer_id", user!.id)
        .order("order_index");
      if (error) throw error;
      return data as KetoType[];
    },
    enabled: !!user,
  });

  // Category mutations
  const saveCat = useMutation({
    mutationFn: async () => {
      if (editingCat) {
        const { error } = await supabase
          .from("keto_categories")
          .update({ name: catForm.name, color: catForm.color })
          .eq("id", editingCat.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("keto_categories").insert({
          trainer_id: user!.id,
          name: catForm.name,
          color: catForm.color,
          order_index: (categories?.length || 0),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-keto-categories"] });
      setCatDialogOpen(false);
      toast.success(editingCat ? "Category updated" : "Category created");
    },
  });

  const deleteCat = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("keto_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-keto-categories"] });
      queryClient.invalidateQueries({ queryKey: ["trainer-keto-types"] });
      toast.success("Category deleted");
    },
  });

  // Type mutations
  const saveType = useMutation({
    mutationFn: async () => {
      const payload = {
        trainer_id: user!.id,
        category_id: typeForm.category_id,
        abbreviation: typeForm.abbreviation,
        name: typeForm.name,
        subtitle: typeForm.subtitle || null,
        description: typeForm.description || null,
        fat_pct: typeForm.fat_pct,
        protein_pct: typeForm.protein_pct,
        carbs_pct: typeForm.carbs_pct,
        carb_limit_grams: typeForm.carb_limit_grams,
        difficulty: typeForm.difficulty,
        engine_compatibility: typeForm.engine_compatibility,
        how_it_works: typeForm.how_it_works || null,
        built_for: typeForm.built_for,
        coach_notes: typeForm.coach_notes,
        color: typeForm.color,
      };
      if (editingType) {
        const { error } = await supabase.from("keto_types").update(payload).eq("id", editingType.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("keto_types").insert({
          ...payload,
          order_index: (ketoTypes?.filter((t) => t.category_id === typeForm.category_id).length || 0),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-keto-types"] });
      setTypeDialogOpen(false);
      toast.success(editingType ? "Keto type updated" : "Keto type created");
    },
  });

  const deleteType = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("keto_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-keto-types"] });
      toast.success("Keto type deleted");
    },
  });

  const openNewCat = () => {
    setEditingCat(null);
    setCatForm({ name: "", color: "#3b82f6" });
    setCatDialogOpen(true);
  };

  const openEditCat = (cat: KetoCategory) => {
    setEditingCat(cat);
    setCatForm({ name: cat.name, color: cat.color });
    setCatDialogOpen(true);
  };

  const openNewType = (categoryId?: string) => {
    setEditingType(null);
    setTypeForm({ ...emptyType, category_id: categoryId || categories?.[0]?.id || "" });
    setBuiltForInput("");
    setCoachNoteInput("");
    setTypeDialogOpen(true);
  };

  const openEditType = (kt: KetoType) => {
    setEditingType(kt);
    setTypeForm({
      abbreviation: kt.abbreviation,
      name: kt.name,
      subtitle: kt.subtitle || "",
      description: kt.description || "",
      fat_pct: kt.fat_pct,
      protein_pct: kt.protein_pct,
      carbs_pct: kt.carbs_pct,
      carb_limit_grams: kt.carb_limit_grams,
      difficulty: kt.difficulty,
      engine_compatibility: kt.engine_compatibility,
      how_it_works: kt.how_it_works || "",
      built_for: kt.built_for || [],
      coach_notes: kt.coach_notes || [],
      color: kt.color,
      category_id: kt.category_id,
    });
    setBuiltForInput("");
    setCoachNoteInput("");
    setTypeDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" /> Keto Types
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage keto diet categories and types for your clients
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={openNewCat}>
              <FolderPlus className="h-4 w-4 mr-1" /> Category
            </Button>
            <Button size="sm" onClick={() => openNewType()} disabled={!categories?.length}>
              <Plus className="h-4 w-4 mr-1" /> Keto Type
            </Button>
          </div>
        </div>

        {/* Category + type list */}
        {categories?.map((cat) => {
          const typesInCat = ketoTypes?.filter((t) => t.category_id === cat.id) || [];

          return (
            <div key={cat.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-7 w-7 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${cat.color}20` }}
                  >
                    <Zap className="h-3.5 w-3.5" style={{ color: cat.color }} />
                  </div>
                  <span className="font-semibold" style={{ color: cat.color }}>{cat.name}</span>
                  <Badge variant="secondary" className="text-xs">{typesInCat.length}</Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openNewType(cat.id)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditCat(cat)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => { if (confirm("Delete this category and all its types?")) deleteCat.mutate(cat.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {typesInCat.map((kt) => (
                <div key={kt.id} className="group relative">
                  <KetoTypeCard
                    abbreviation={kt.abbreviation}
                    name={kt.name}
                    subtitle={kt.subtitle}
                    fat_pct={kt.fat_pct}
                    protein_pct={kt.protein_pct}
                    carbs_pct={kt.carbs_pct}
                    difficulty={kt.difficulty}
                    color={kt.color}
                    onClick={() => setViewingType(kt)}
                  />
                  {/* Hover actions overlay */}
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7 bg-background/90 shadow-sm"
                      onClick={(e) => { e.stopPropagation(); openEditType(kt); }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7 bg-background/90 shadow-sm text-destructive"
                      onClick={(e) => { e.stopPropagation(); if (confirm(`Delete ${kt.abbreviation}?`)) deleteType.mutate(kt.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}

              {typesInCat.length === 0 && (
                <p className="text-sm text-muted-foreground pl-9">
                  No types yet.{" "}
                  <button className="text-primary underline" onClick={() => openNewType(cat.id)}>
                    Add one
                  </button>
                </p>
              )}
            </div>
          );
        })}

        {(!categories || categories.length === 0) && (
          <div className="text-center py-16 text-muted-foreground">
            <Zap className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No keto categories yet</p>
            <p className="text-sm mt-1">Create a category to start adding keto types.</p>
            <Button className="mt-4" onClick={openNewCat}>
              <FolderPlus className="h-4 w-4 mr-1" /> Create Category
            </Button>
          </div>
        )}
      </div>

      {/* Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingCat ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={catForm.name}
                onChange={(e) => setCatForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Strict Keto"
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap mt-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    className="h-7 w-7 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: c,
                      borderColor: catForm.color === c ? "white" : "transparent",
                      boxShadow: catForm.color === c ? `0 0 0 2px ${c}` : "none",
                    }}
                    onClick={() => setCatForm((p) => ({ ...p, color: c }))}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveCat.mutate()} disabled={!catForm.name || saveCat.isPending}>
              {editingCat ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Keto Type Dialog */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingType ? "Edit Keto Type" : "New Keto Type"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Category */}
            <div>
              <Label>Category</Label>
              <Select value={typeForm.category_id} onValueChange={(v) => setTypeForm((p) => ({ ...p, category_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Abbreviation + Name */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Abbreviation</Label>
                <Input
                  value={typeForm.abbreviation}
                  onChange={(e) => setTypeForm((p) => ({ ...p, abbreviation: e.target.value.toUpperCase() }))}
                  placeholder="SKD"
                  maxLength={6}
                />
              </div>
              <div className="col-span-2">
                <Label>Name</Label>
                <Input
                  value={typeForm.name}
                  onChange={(e) => setTypeForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Standard Ketogenic Diet"
                />
              </div>
            </div>

            {/* Subtitle */}
            <div>
              <Label>Subtitle</Label>
              <Input
                value={typeForm.subtitle}
                onChange={(e) => setTypeForm((p) => ({ ...p, subtitle: e.target.value }))}
                placeholder="The bedrock of keto"
              />
            </div>

            {/* Description */}
            <div>
              <Label>Description</Label>
              <Textarea
                value={typeForm.description}
                onChange={(e) => setTypeForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Detailed description..."
                rows={3}
              />
            </div>

            {/* Macros */}
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label>Fat %</Label>
                <Input
                  type="number"
                  value={typeForm.fat_pct}
                  onChange={(e) => setTypeForm((p) => ({ ...p, fat_pct: +e.target.value }))}
                />
              </div>
              <div>
                <Label>Protein %</Label>
                <Input
                  type="number"
                  value={typeForm.protein_pct}
                  onChange={(e) => setTypeForm((p) => ({ ...p, protein_pct: +e.target.value }))}
                />
              </div>
              <div>
                <Label>Carbs %</Label>
                <Input
                  type="number"
                  value={typeForm.carbs_pct}
                  onChange={(e) => setTypeForm((p) => ({ ...p, carbs_pct: +e.target.value }))}
                />
              </div>
              <div>
                <Label>Carb Limit (g)</Label>
                <Input
                  type="number"
                  value={typeForm.carb_limit_grams ?? ""}
                  onChange={(e) => setTypeForm((p) => ({ ...p, carb_limit_grams: e.target.value ? +e.target.value : null }))}
                  placeholder="20"
                />
              </div>
            </div>

            {/* Difficulty + Engine + Color */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Difficulty</Label>
                <Select value={typeForm.difficulty} onValueChange={(v) => setTypeForm((p) => ({ ...p, difficulty: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Engine</Label>
                <Select value={typeForm.engine_compatibility} onValueChange={(v) => setTypeForm((p) => ({ ...p, engine_compatibility: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Both</SelectItem>
                    <SelectItem value="metabolic">Metabolic</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex gap-1.5 flex-wrap mt-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      className="h-6 w-6 rounded-full border-2 transition-all"
                      style={{
                        backgroundColor: c,
                        borderColor: typeForm.color === c ? "white" : "transparent",
                        boxShadow: typeForm.color === c ? `0 0 0 2px ${c}` : "none",
                      }}
                      onClick={() => setTypeForm((p) => ({ ...p, color: c }))}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* How it works */}
            <div>
              <Label>How It Works</Label>
              <Textarea
                value={typeForm.how_it_works}
                onChange={(e) => setTypeForm((p) => ({ ...p, how_it_works: e.target.value }))}
                placeholder="Explain how this keto type works..."
                rows={3}
              />
            </div>

            {/* Built for */}
            <div>
              <Label>Built For (press Enter to add)</Label>
              <div className="flex gap-2">
                <Input
                  value={builtForInput}
                  onChange={(e) => setBuiltForInput(e.target.value)}
                  placeholder="e.g. Keto beginners..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && builtForInput.trim()) {
                      e.preventDefault();
                      setTypeForm((p) => ({ ...p, built_for: [...p.built_for, builtForInput.trim()] }));
                      setBuiltForInput("");
                    }
                  }}
                />
              </div>
              {typeForm.built_for.map((item, i) => (
                <div key={i} className="flex items-center gap-2 mt-1">
                  <span className="text-sm flex-1">{item}</span>
                  <button
                    className="text-xs text-destructive"
                    onClick={() => setTypeForm((p) => ({ ...p, built_for: p.built_for.filter((_, j) => j !== i) }))}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {/* Coach notes */}
            <div>
              <Label>Coach Notes (press Enter to add)</Label>
              <div className="flex gap-2">
                <Input
                  value={coachNoteInput}
                  onChange={(e) => setCoachNoteInput(e.target.value)}
                  placeholder="e.g. Monitor energy levels..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && coachNoteInput.trim()) {
                      e.preventDefault();
                      setTypeForm((p) => ({ ...p, coach_notes: [...p.coach_notes, coachNoteInput.trim()] }));
                      setCoachNoteInput("");
                    }
                  }}
                />
              </div>
              {typeForm.coach_notes.map((note, i) => (
                <div key={i} className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                  <span className="text-sm flex-1">{note}</span>
                  <button
                    className="text-xs text-destructive"
                    onClick={() => setTypeForm((p) => ({ ...p, coach_notes: p.coach_notes.filter((_, j) => j !== i) }))}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTypeDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveType.mutate()}
              disabled={!typeForm.abbreviation || !typeForm.name || !typeForm.category_id || saveType.isPending}
            >
              {editingType ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={!!viewingType} onOpenChange={(open) => !open && setViewingType(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
          <SheetHeader className="px-5 pt-5 pb-2">
            <SheetTitle className="sr-only">{viewingType?.name}</SheetTitle>
          </SheetHeader>
          {viewingType && (
            <div className="px-4 pb-8">
              <KetoTypeDetailView
                ketoType={viewingType}
                allTypes={ketoTypes?.filter(t => t.is_active) || []}
              />
              <div className="flex gap-2 mt-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    openEditType(viewingType);
                    setViewingType(null);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-1" /> Edit
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    if (confirm(`Delete ${viewingType.abbreviation}?`)) {
                      deleteType.mutate(viewingType.id);
                      setViewingType(null);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}
