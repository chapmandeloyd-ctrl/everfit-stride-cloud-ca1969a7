import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2, Upload, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Scene {
  id: string;
  name: string;
  description: string | null;
  category: string;
  thumbnail_url: string | null;
  video_url: string;
  audio_url: string | null;
  audio_volume: number;
  loop_video: boolean;
  is_premium: boolean;
  is_active: boolean;
  sort_order: number;
}

// Must match client-side filter buckets in ClientPortal (Focus / Sleep / Escape)
const CATEGORIES = ["Focus", "Sleep", "Escape"];

export default function PortalAdmin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Scene | null>(null);
  const [form, setForm] = useState<Partial<Scene>>({});
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  const { data: scenes = [] } = useQuery({
    queryKey: ["portal-scenes-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_scenes")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as Scene[];
    },
  });

  const openNew = (preset?: string) => {
    setEditing(null);
    setForm({
      name: "",
      description: "",
      category: preset ?? "Focus",
      audio_volume: 0.7,
      loop_video: true,
      is_premium: false,
      is_active: true,
      sort_order: scenes.length,
    });
    setOpen(true);
  };

  const reassignCategory = async (scene: Scene, newCategory: string) => {
    const { error } = await supabase
      .from("portal_scenes")
      .update({ category: newCategory })
      .eq("id", scene.id);
    if (error) return toast.error(error.message);
    toast.success(`Moved "${scene.name}" → ${newCategory}`);
    qc.invalidateQueries({ queryKey: ["portal-scenes-admin"] });
    qc.invalidateQueries({ queryKey: ["portal-scenes-client"] });
  };

  const openEdit = (s: Scene) => {
    setEditing(s);
    setForm(s);
    setOpen(true);
  };

  const upload = async (
    file: File,
    bucket: string,
    setLoading: (v: boolean) => void,
    field: "video_url" | "thumbnail_url" | "audio_url"
  ) => {
    setLoading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user?.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      setForm((f) => ({ ...f, [field]: data.publicUrl }));
      toast.success("Uploaded");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!form.name || !form.video_url || !user) {
      toast.error("Name and video are required");
      return;
    }
    try {
      if (editing) {
        const { error } = await supabase
          .from("portal_scenes")
          .update({
            name: form.name,
            description: form.description ?? null,
            category: form.category!,
            thumbnail_url: form.thumbnail_url ?? null,
            video_url: form.video_url,
            audio_url: form.audio_url ?? null,
            audio_volume: form.audio_volume ?? 0.7,
            loop_video: form.loop_video ?? true,
            is_premium: form.is_premium ?? false,
            is_active: form.is_active ?? true,
            sort_order: form.sort_order ?? 0,
          })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("portal_scenes").insert({
          trainer_id: user.id,
          name: form.name,
          description: form.description ?? null,
          category: form.category!,
          thumbnail_url: form.thumbnail_url ?? null,
          video_url: form.video_url,
          audio_url: form.audio_url ?? null,
          audio_volume: form.audio_volume ?? 0.7,
          loop_video: form.loop_video ?? true,
          is_premium: form.is_premium ?? false,
          is_active: form.is_active ?? true,
          sort_order: form.sort_order ?? 0,
        });
        if (error) throw error;
      }
      toast.success(editing ? "Scene updated" : "Scene created");
      qc.invalidateQueries({ queryKey: ["portal-scenes-admin"] });
      qc.invalidateQueries({ queryKey: ["portal-scenes-client"] });
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this scene?")) return;
    const { error } = await supabase.from("portal_scenes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["portal-scenes-admin"] });
  };

  const renderSceneCard = (s: Scene, isOrphan = false) => (
    <Card key={s.id} className={`overflow-hidden ${isOrphan ? "ring-2 ring-amber-500/60" : ""}`}>
      <div className="relative aspect-video bg-muted">
        {s.thumbnail_url ? (
          <img src={s.thumbnail_url} alt={s.name} className="w-full h-full object-cover" />
        ) : (
          <video src={s.video_url} muted className="w-full h-full object-cover" />
        )}
        {!s.is_active && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white text-xs uppercase tracking-wider">Inactive</span>
          </div>
        )}
      </div>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-medium truncate">{s.name}</div>
            <div className="text-xs text-muted-foreground capitalize">{s.category}</div>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => remove(s.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
        {isOrphan && (
          <div className="flex flex-wrap gap-1 pt-1 border-t">
            <span className="text-xs text-muted-foreground w-full mb-1">Move to:</span>
            {CATEGORIES.map((c) => (
              <Button
                key={c}
                size="sm"
                variant="secondary"
                className="h-6 text-xs px-2"
                onClick={() => reassignCategory(s, c)}
              >
                {c}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );


  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Portal Scenes</h1>
            <p className="text-sm text-muted-foreground">
              Organize scenes into Focus, Sleep, and Escape — these are the tabs clients see.
            </p>
          </div>
          <Button onClick={() => openNew()} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" /> New Scene
          </Button>
        </div>

        {scenes.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <p>No scenes yet. Create your first Portal scene.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {(() => {
              const valid = new Set(CATEGORIES);
              const orphans = scenes.filter((s) => !valid.has(s.category));
              return (
                <>
                  {CATEGORIES.map((cat) => {
                    const inCat = scenes.filter((s) => s.category === cat);
                    return (
                      <section key={cat}>
                        <div className="flex items-center justify-between mb-3">
                          <h2 className="text-lg font-semibold">
                            {cat}{" "}
                            <span className="text-sm font-normal text-muted-foreground">
                              ({inCat.length})
                            </span>
                          </h2>
                          <Button variant="outline" size="sm" onClick={() => openNew(cat)}>
                            <Plus className="h-3.5 w-3.5 mr-1" /> Add to {cat}
                          </Button>
                        </div>
                        {inCat.length === 0 ? (
                          <Card>
                            <CardContent className="p-6 text-center text-sm text-muted-foreground">
                              No {cat} scenes yet.
                            </CardContent>
                          </Card>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {inCat.map((s) => renderSceneCard(s))}
                          </div>
                        )}
                      </section>
                    );
                  })}

                  {orphans.length > 0 && (
                    <section>
                      <div className="mb-3">
                        <h2 className="text-lg font-semibold text-amber-600">
                          ⚠️ Uncategorized ({orphans.length})
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          These scenes use old categories and won't appear to clients. Move each one to Focus, Sleep, or Escape.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {orphans.map((s) => renderSceneCard(s, true))}
                      </div>
                    </section>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Scene" : "New Scene"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Name *</Label>
              <Input
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Rainy Cabin"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Cozy cabin in the rain"
                rows={2}
              />
            </div>

            <div>
              <Label>Category</Label>
              <select
                className="w-full border rounded-md px-3 py-2 bg-background"
                value={form.category || "nature"}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Video Loop *</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) upload(f, "portal-videos", setUploadingVideo, "video_url");
                  }}
                  disabled={uploadingVideo}
                />
                {uploadingVideo && <Upload className="h-4 w-4 animate-pulse" />}
              </div>
              {form.video_url && (
                <video
                  src={form.video_url}
                  muted
                  loop
                  autoPlay
                  className="mt-2 rounded-md aspect-video w-full object-cover"
                />
              )}
            </div>

            <div>
              <Label>Thumbnail (optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) upload(f, "portal-videos", setUploadingThumb, "thumbnail_url");
                  }}
                  disabled={uploadingThumb}
                />
                {uploadingThumb && <Upload className="h-4 w-4 animate-pulse" />}
              </div>
              {form.thumbnail_url && (
                <img
                  src={form.thumbnail_url}
                  alt=""
                  className="mt-2 rounded-md aspect-video w-full object-cover"
                />
              )}
            </div>

            <div>
              <Label>Ambient Audio (optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) upload(f, "portal-videos", setUploadingAudio, "audio_url");
                  }}
                  disabled={uploadingAudio}
                />
                {uploadingAudio && <Upload className="h-4 w-4 animate-pulse" />}
              </div>
              {form.audio_url && (
                <audio src={form.audio_url} controls className="mt-2 w-full" />
              )}
            </div>

            {form.audio_url && (
              <div>
                <Label>Default Volume: {Math.round((form.audio_volume ?? 0.7) * 100)}%</Label>
                <Slider
                  value={[(form.audio_volume ?? 0.7) * 100]}
                  onValueChange={(v) => setForm({ ...form, audio_volume: v[0] / 100 })}
                  max={100}
                  step={1}
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label>Loop Video</Label>
              <Switch
                checked={form.loop_video ?? true}
                onCheckedChange={(c) => setForm({ ...form, loop_video: c })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Premium Only</Label>
              <Switch
                checked={form.is_premium ?? false}
                onCheckedChange={(c) => setForm({ ...form, is_premium: c })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={form.is_active ?? true}
                onCheckedChange={(c) => setForm({ ...form, is_active: c })}
              />
            </div>

            <div>
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={form.sort_order ?? 0}
                onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>{editing ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
