import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, ArrowLeft, Music, Pin, Plus, Pencil, Trash2 } from "lucide-react";
import { BreathingPlayer } from "@/components/vibes/BreathingPlayer";
import { ManageBreathingMusicDialog } from "./ManageBreathingMusicDialog";
import { BreathingExerciseEditorDialog } from "./BreathingExerciseEditorDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  useBreathingExercisesAdmin,
  rowToExercise,
  type DBBreathingExerciseRow,
} from "@/hooks/useBreathingExercises";
import type { BreathingExercise } from "@/lib/breathingExercises";

export function AdminBreathingTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [previewExercise, setPreviewExercise] = useState<BreathingExercise | null>(null);
  const [musicDialogOpen, setMusicDialogOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<DBBreathingExerciseRow | null>(null);
  const [autoPickOnOpen, setAutoPickOnOpen] = useState(false);

  const { data: rows = [], isLoading } = useBreathingExercisesAdmin();

  const { data: tracks = [] } = useQuery({
    queryKey: ["breathing-music-tracks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("breathing_music_tracks")
        .select("*")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: pinnedMap = {} } = useQuery({
    queryKey: ["breathing-exercise-music"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("breathing_exercise_music")
        .select("*");
      if (error) throw error;
      const map: Record<string, string> = {};
      data.forEach((row: any) => { map[row.exercise_id] = row.track_id; });
      return map;
    },
  });

  const pinTrack = useMutation({
    mutationFn: async ({ exerciseId, trackId }: { exerciseId: string; trackId: string | null }) => {
      if (!user) return;
      if (trackId === null) {
        await supabase.from("breathing_exercise_music").delete()
          .eq("exercise_id", exerciseId).eq("trainer_id", user.id);
      } else {
        const { error } = await supabase.from("breathing_exercise_music").upsert({
          exercise_id: exerciseId,
          track_id: trackId,
          trainer_id: user.id,
        }, { onConflict: "exercise_id,trainer_id" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["breathing-exercise-music"] });
      toast.success("Track assignment updated");
    },
  });

  const deleteExercise = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("breathing_exercises").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["breathing-exercises-admin"] });
      queryClient.invalidateQueries({ queryKey: ["breathing-exercises-library"] });
      toast.success("Exercise deleted");
    },
    onError: (err: any) => toast.error(err.message ?? "Delete failed"),
  });

  if (previewExercise) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setPreviewExercise(null)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to list
        </Button>
        <div className="max-w-md mx-auto rounded-2xl overflow-hidden relative" style={{ aspectRatio: "9/16", background: "hsl(220, 25%, 5%)" }}>
          <BreathingPlayer
            exercise={previewExercise}
            onBack={() => setPreviewExercise(null)}
            contained
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? "exercise" : "exercises"} · shown to clients in Restore → Breathe
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAutoPickOnOpen(false);
              setMusicDialogOpen(true);
            }}
          >
            <Music className="h-4 w-4 mr-1" /> Music
          </Button>
          <Button
            size="sm"
            onClick={() => { setEditing(null); setEditorOpen(true); }}
          >
            <Plus className="h-4 w-4 mr-1" /> New exercise
          </Button>
        </div>
      </div>

      <ManageBreathingMusicDialog
        open={musicDialogOpen}
        onOpenChange={(nextOpen) => {
          setMusicDialogOpen(nextOpen);
          if (!nextOpen) setAutoPickOnOpen(false);
        }}
        autoPickOnOpen={autoPickOnOpen}
      />

      <BreathingExerciseEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        editing={editing}
      />

      {isLoading ? (
        <div className="text-center text-sm text-muted-foreground py-8">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-12 border border-dashed rounded-lg">
          No exercises yet. Click <strong>New exercise</strong> to create your first.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((row) => {
            const ex = rowToExercise(row);
            const pinnedTrackId = pinnedMap[row.id] ?? row.default_track_id;

            return (
              <Card key={row.id} className={!row.is_active ? "opacity-60" : undefined}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-2xl shrink-0">{ex.icon}</div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{ex.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ex.description}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => setPreviewExercise(ex)} title="Preview">
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => { setEditing(row); setEditorOpen(true); }}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="text-destructive/70 hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Delete "${ex.name}"?`)) deleteExercise.mutate(row.id);
                        }}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {ex.phases.map((phase, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {phase.label} {phase.seconds}s
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs capitalize">{ex.animation}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {ex.phases.reduce((s, p) => s + p.seconds, 0)}s per cycle
                    </span>
                    {!row.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Pin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Select
                      value={pinnedTrackId ?? "none"}
                      onValueChange={(val) =>
                        pinTrack.mutate({ exerciseId: row.id, trackId: val === "none" ? null : val })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue placeholder="Default (shared library)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Default (shared library)</SelectItem>
                        {tracks.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
