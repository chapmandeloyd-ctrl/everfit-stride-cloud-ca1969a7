import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["Focus", "Sleep", "Escape"] as const;

interface Background {
  id: string;
  name: string;
  layer: "nebula" | "horizon";
  image_url: string;
  category: string | null;
  is_active: boolean;
  sort_order: number;
}

interface CategoryDefault {
  category: string;
  nebula_id: string | null;
  horizon_id: string | null;
  show_horizon: boolean;
}

export function PortalBackgroundsManager() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Background>>({});
  const [uploading, setUploading] = useState(false);

  const { data: backgrounds = [] } = useQuery({
    queryKey: ["portal-backgrounds-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_backgrounds" as any)
        .select("*")
        .order("layer")
        .order("sort_order");
      if (error) throw error;
      return (data || []) as unknown as Background[];
    },
  });

  const { data: categoryDefaults = [] } = useQuery({
    queryKey: ["portal-category-backgrounds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_category_backgrounds" as any)
        .select("*");
      if (error) throw error;
      return (data || []) as unknown as CategoryDefault[];
    },
  });

  const openNew = (layer: "nebula" | "horizon") => {
    setForm({
      name: "",
      layer,
      image_url: "",
      category: null,
      is_active: true,
      sort_order: backgrounds.filter((b) => b.layer === layer).length,
    });
    setOpen(true);
  };

  const upload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/backgrounds/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("portal-videos")
        .upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("portal-videos").getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: data.publicUrl }));
      toast.success("Uploaded");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.name || !form.image_url || !form.layer) {
      toast.error("Name and image are required");
      return;
    }
    const { error } = await supabase.from("portal_backgrounds" as any).insert({
      name: form.name,
      layer: form.layer,
      image_url: form.image_url,
      category: form.category || null,
      is_active: form.is_active ?? true,
      sort_order: form.sort_order ?? 0,
    });
    if (error) return toast.error(error.message);
    toast.success("Background added");
    qc.invalidateQueries({ queryKey: ["portal-backgrounds-admin"] });
    qc.invalidateQueries({ queryKey: ["portal-backgrounds-client"] });
    setOpen(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this background?")) return;
    const { error } = await supabase
      .from("portal_backgrounds" as any)
      .delete()
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["portal-backgrounds-admin"] });
    qc.invalidateQueries({ queryKey: ["portal-backgrounds-client"] });
  };

  const toggleActive = async (b: Background) => {
    const { error } = await supabase
      .from("portal_backgrounds" as any)
      .update({ is_active: !b.is_active })
      .eq("id", b.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["portal-backgrounds-admin"] });
    qc.invalidateQueries({ queryKey: ["portal-backgrounds-client"] });
  };

  const setCategoryDefault = async (
    category: string,
    field: "nebula_id" | "horizon_id" | "show_horizon",
    value: string | boolean | null,
  ) => {
    const existing = categoryDefaults.find((c) => c.category === category);
    const payload: any = { category };
    if (existing) {
      payload.nebula_id = existing.nebula_id;
      payload.horizon_id = existing.horizon_id;
      payload.show_horizon = existing.show_horizon;
    } else {
      payload.show_horizon = true;
    }
    payload[field] = value;
    const { error } = await supabase
      .from("portal_category_backgrounds" as any)
      .upsert(payload, { onConflict: "category" });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["portal-category-backgrounds"] });
  };

  const nebulas = backgrounds.filter((b) => b.layer === "nebula");
  const horizons = backgrounds.filter((b) => b.layer === "horizon");

  const renderLibrary = (
    layer: "nebula" | "horizon",
    list: Background[],
    title: string,
    description: string,
  ) => (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => openNew(layer)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add {layer}
        </Button>
      </div>
      {list.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No {layer}s uploaded yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {list.map((b) => (
            <Card key={b.id} className="overflow-hidden">
              <div className="relative aspect-video bg-muted">
                <img
                  src={b.image_url}
                  alt={b.name}
                  className="w-full h-full object-cover"
                />
                {!b.is_active && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white text-xs uppercase tracking-wider">
                      Inactive
                    </span>
                  </div>
                )}
              </div>
              <CardContent className="p-2 space-y-2">
                <div className="text-sm font-medium truncate">{b.name}</div>
                {b.category && (
                  <div className="text-[10px] text-muted-foreground uppercase">
                    {b.category}
                  </div>
                )}
                <div className="flex items-center justify-between gap-1">
                  <Switch
                    checked={b.is_active}
                    onCheckedChange={() => toggleActive(b)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => remove(b.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="space-y-8">
      {/* Per-category defaults */}
      <section>
        <h2 className="text-lg font-semibold mb-1">Category Defaults</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Pick the default nebula and horizon used by every scene in each category. Per-scene overrides take priority.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {CATEGORIES.map((cat) => {
            const def = categoryDefaults.find((c) => c.category === cat);
            return (
              <Card key={cat}>
                <CardContent className="p-4 space-y-3">
                  <div className="font-semibold">{cat}</div>
                  <div>
                    <Label className="text-xs">Nebula</Label>
                    <Select
                      value={def?.nebula_id ?? "none"}
                      onValueChange={(v) =>
                        setCategoryDefault(cat, "nebula_id", v === "none" ? null : v)
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Default" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Built-in default —</SelectItem>
                        {nebulas
                          .filter((n) => n.is_active)
                          .map((n) => (
                            <SelectItem key={n.id} value={n.id}>
                              {n.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Horizon</Label>
                    <Select
                      value={def?.horizon_id ?? "none"}
                      onValueChange={(v) =>
                        setCategoryDefault(cat, "horizon_id", v === "none" ? null : v)
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Default" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Built-in Earth —</SelectItem>
                        {horizons
                          .filter((h) => h.is_active)
                          .map((h) => (
                            <SelectItem key={h.id} value={h.id}>
                              {h.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <Label className="text-xs">Show horizon</Label>
                    <Switch
                      checked={def?.show_horizon ?? true}
                      onCheckedChange={(c) =>
                        setCategoryDefault(cat, "show_horizon", c)
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {renderLibrary(
        "nebula",
        nebulas,
        "Nebula Library",
        "Full-screen cosmic backdrops shown behind the scene circle.",
      )}
      {renderLibrary(
        "horizon",
        horizons,
        "Horizon Library",
        "Bottom-of-screen images (Earth, ocean, mountains, etc).",
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add {form.layer === "nebula" ? "Nebula" : "Horizon"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name *</Label>
              <Input
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={form.layer === "nebula" ? "Deep Space Blue" : "Pacific Ocean"}
              />
            </div>
            <div>
              <Label>Image *</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) upload(f);
                  }}
                  disabled={uploading}
                />
                {uploading && <Upload className="h-4 w-4 animate-pulse" />}
              </div>
              {form.image_url && (
                <img
                  src={form.image_url}
                  alt=""
                  className="mt-2 rounded-md aspect-video w-full object-cover"
                />
              )}
            </div>
            <div>
              <Label>Tag (optional)</Label>
              <Select
                value={form.category ?? "any"}
                onValueChange={(v) =>
                  setForm({ ...form, category: v === "any" ? null : v })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any category</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                For your own organization — doesn't restrict where it can be used.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={form.is_active ?? true}
                onCheckedChange={(c) => setForm({ ...form, is_active: c })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
