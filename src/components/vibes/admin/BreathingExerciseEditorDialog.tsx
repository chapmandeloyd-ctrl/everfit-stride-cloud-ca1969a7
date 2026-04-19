import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { DBBreathingExerciseRow } from "@/hooks/useBreathingExercises";

interface PhaseInput {
  label: string;
  seconds: number;
  type: "inhale" | "hold" | "exhale";
}

const ANIMATIONS = ["ocean", "lotus", "orbital", "aurora", "heartbeat"] as const;
const ARC_MODES = ["activate", "regulate", "downshift"] as const;

const DEFAULT_PHASES: PhaseInput[] = [
  { label: "Inhale", seconds: 4, type: "inhale" },
  { label: "Hold", seconds: 2, type: "hold" },
  { label: "Exhale", seconds: 6, type: "exhale" },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** When provided, edit this row; otherwise create new. */
  editing?: DBBreathingExerciseRow | null;
}

export function BreathingExerciseEditorDialog({ open, onOpenChange, editing }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🌬️");
  const [animation, setAnimation] = useState<typeof ANIMATIONS[number]>("ocean");
  const [arcMode, setArcMode] = useState<typeof ARC_MODES[number]>("downshift");
  const [phases, setPhases] = useState<PhaseInput[]>(DEFAULT_PHASES);
  const [defaultTrackId, setDefaultTrackId] = useState<string | "none">("none");
  const [isActive, setIsActive] = useState(true);

  const { data: tracks = [] } = useQuery({
    queryKey: ["breathing-music-tracks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("breathing_music_tracks")
        .select("id, name")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  // Reset / hydrate when dialog opens
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setDescription(editing.description ?? "");
      setIcon(editing.icon ?? "🌬️");
      setAnimation((editing.animation as any) ?? "ocean");
      setArcMode((editing.motion?.arcMode as any) ?? "downshift");
      setPhases((editing.phases as PhaseInput[]) ?? DEFAULT_PHASES);
      setDefaultTrackId(editing.default_track_id ?? "none");
      setIsActive(editing.is_active);
    } else {
      setName("");
      setDescription("");
      setIcon("🌬️");
      setAnimation("ocean");
      setArcMode("downshift");
      setPhases(DEFAULT_PHASES);
      setDefaultTrackId("none");
      setIsActive(true);
    }
  }, [open, editing]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!name.trim()) throw new Error("Name is required");
      if (phases.length === 0) throw new Error("Add at least one phase");

      // Build motion + tone defaults based on arc mode (sensible presets)
      const motion = {
        motionType:
          arcMode === "downshift" ? "horizon-drift"
          : arcMode === "activate" ? "ascent-arc"
          : "balanced-breath",
        luminanceAmplitude: 0.05,
        particleDensity: 1.1,
        particleSpeedMul: 0.8,
        particleDriftMul: 1.5,
        sweepAngle: 0,
        hueSpread: 30,
        arcMode,
      };
      const tone = editing?.tone ?? { hueBase: 215, hueSat: 50, warmth: 0.15, luminanceSpeed: 0.95 };

      const payload: any = {
        trainer_id: user.id,
        slug:
          editing?.slug ??
          (name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `exercise-${Date.now()}`),
        name: name.trim(),
        description: description.trim(),
        icon: icon.trim() || "🌬️",
        animation,
        phases: phases as any,
        tone: tone as any,
        motion: motion as any,
        music_prompt: editing?.music_prompt ?? "",
        default_track_id: defaultTrackId === "none" ? null : defaultTrackId,
        is_active: isActive,
      };

      if (editing) {
        const { error } = await supabase
          .from("breathing_exercises")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("breathing_exercises").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["breathing-exercises-admin"] });
      qc.invalidateQueries({ queryKey: ["breathing-exercises-library"] });
      toast.success(editing ? "Exercise updated" : "Exercise created");
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message ?? "Save failed"),
  });

  const updatePhase = (idx: number, patch: Partial<PhaseInput>) => {
    setPhases((p) => p.map((ph, i) => (i === idx ? { ...ph, ...patch } : ph)));
  };

  const cycleSeconds = phases.reduce((s, p) => s + (p.seconds || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92vw] sm:max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit breathing exercise" : "New breathing exercise"}</DialogTitle>
          <DialogDescription className="text-xs">
            Define the breath pattern, animation style, and default music. {cycleSeconds}s per cycle.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-[60px_1fr] gap-2">
            <div>
              <Label className="text-xs">Icon</Label>
              <Input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} className="text-center text-xl h-10" />
            </div>
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ocean Downshift" className="h-10" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short explanation shown to the client"
              className="min-h-[60px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Animation style</Label>
              <Select value={animation} onValueChange={(v) => setAnimation(v as any)}>
                <SelectTrigger className="h-9 text-sm capitalize"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ANIMATIONS.map((a) => <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Energy mode</Label>
              <Select value={arcMode} onValueChange={(v) => setArcMode(v as any)}>
                <SelectTrigger className="h-9 text-sm capitalize"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ARC_MODES.map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs">Breath phases</Label>
              <Button
                type="button" variant="ghost" size="sm"
                onClick={() => setPhases((p) => [...p, { label: "Hold", seconds: 2, type: "hold" }])}
              >
                <Plus className="h-3 w-3 mr-1" /> Add phase
              </Button>
            </div>
            <div className="space-y-2">
              {phases.map((ph, i) => (
                <div key={i} className="grid grid-cols-[1fr_90px_70px_36px] gap-2 items-center">
                  <Select value={ph.type} onValueChange={(v) => updatePhase(i, { type: v as any, label: v.charAt(0).toUpperCase() + v.slice(1) })}>
                    <SelectTrigger className="h-9 text-sm capitalize"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inhale">Inhale</SelectItem>
                      <SelectItem value="hold">Hold</SelectItem>
                      <SelectItem value="exhale">Exhale</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={ph.label}
                    onChange={(e) => updatePhase(i, { label: e.target.value })}
                    className="h-9 text-sm"
                  />
                  <Input
                    type="number" min={1} max={30}
                    value={ph.seconds}
                    onChange={(e) => updatePhase(i, { seconds: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="h-9 text-sm"
                  />
                  <Button
                    type="button" variant="ghost" size="icon"
                    className="h-9 w-9 text-destructive/70"
                    onClick={() => setPhases((p) => p.filter((_, idx) => idx !== i))}
                    disabled={phases.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Default music track</Label>
            <Select value={defaultTrackId} onValueChange={(v) => setDefaultTrackId(v as any)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (shared library)</SelectItem>
                {tracks.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Inactive exercises are hidden from clients.</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : editing ? "Save changes" : "Create exercise"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
