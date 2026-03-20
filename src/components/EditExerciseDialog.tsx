import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Save, Video, ImageIcon } from "lucide-react";

interface EditExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: any;
}

export function EditExerciseDialog({ open, onOpenChange, exercise }: EditExerciseDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [equipment, setEquipment] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    if (exercise) {
      setName(exercise.name || "");
      setDescription(exercise.description || "");
      setMuscleGroup(exercise.muscle_group || "");
      setEquipment(exercise.equipment || "");
      setCategory(exercise.category || "");
    }
  }, [exercise]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("exercises")
        .update({
          name,
          description: description || null,
          muscle_group: muscleGroup || null,
          equipment: equipment || null,
          category: category || null,
        })
        .eq("id", exercise.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      toast.success("Exercise updated");
      onOpenChange(false);
    },
    onError: () => toast.error("Failed to update exercise"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("exercises").delete().eq("id", exercise.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      toast.success("Exercise deleted");
      onOpenChange(false);
    },
    onError: () => toast.error("Failed to delete exercise"),
  });

  if (!exercise) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Exercise</DialogTitle>
        </DialogHeader>

        {/* Video / Image Preview */}
        <div className="rounded-lg overflow-hidden bg-muted aspect-video">
          {exercise.video_url ? (
            <video
              key={exercise.video_url}
              src={exercise.video_url}
              controls
              autoPlay
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          ) : exercise.image_url ? (
            <img
              src={exercise.image_url}
              alt={exercise.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* Media badges */}
        <div className="flex gap-2">
          {exercise.video_url && (
            <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">
              <Video className="h-3 w-3" /> Video attached
            </span>
          )}
          {exercise.image_url && (
            <span className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2 py-1 rounded-md">
              <ImageIcon className="h-3 w-3" /> Thumbnail
            </span>
          )}
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Muscle Group</Label>
              <Input value={muscleGroup} onChange={(e) => setMuscleGroup(e.target.value)} placeholder="e.g. Chest" />
            </div>
            <div>
              <Label>Equipment</Label>
              <Input value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="e.g. Dumbbells" />
            </div>
          </div>
          <div>
            <Label>Category</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Strength" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending || !name.trim()}
          >
            <Save className="h-4 w-4 mr-1" />
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
