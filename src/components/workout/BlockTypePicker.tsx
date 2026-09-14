import { useState } from "react";
import { WORKOUT_BLOCK_TYPES, WorkoutBlockType } from "@/lib/workoutBlockTypes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface BlockTypePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (blockType: WorkoutBlockType, customName?: string) => void;
}

export function BlockTypePicker({ open, onOpenChange, onSelect }: BlockTypePickerProps) {
  const [customStep, setCustomStep] = useState(false);
  const [customName, setCustomName] = useState("");

  const handleSelect = (bt: WorkoutBlockType) => {
    if (bt.id === "custom") {
      setCustomStep(true);
      return;
    }
    onSelect(bt);
    onOpenChange(false);
  };

  const handleCustomSubmit = () => {
    if (!customName.trim()) return;
    const customBt = WORKOUT_BLOCK_TYPES.find((b) => b.id === "custom")!;
    onSelect(customBt, customName.trim());
    setCustomName("");
    setCustomStep(false);
    onOpenChange(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setCustomStep(false);
      setCustomName("");
    }
    onOpenChange(v);
  };

  if (customStep) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Custom Block Name</DialogTitle>
            <DialogDescription>Enter a name for your custom block</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleCustomSubmit(); }} className="space-y-4">
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g., Plyometrics, Core Work"
              autoFocus
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setCustomStep(false)}>
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={!customName.trim()}>
                Create Block
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[88vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Add Workout Block</DialogTitle>
          <DialogDescription>Choose a block type to organize your workout</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
          {WORKOUT_BLOCK_TYPES.map((bt) => (
            <button
              key={bt.id}
              onClick={() => handleSelect(bt)}
              className="flex flex-col items-center text-center p-5 rounded-2xl border border-border bg-card transition-all hover:border-primary hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <span
                className={`h-12 w-12 rounded-2xl flex items-center justify-center text-2xl mb-3 ${bt.color} border ${bt.borderColor}`}
              >
                {bt.emoji}
              </span>
              <span className="text-base font-semibold text-foreground">{bt.label}</span>
              <span className="text-xs text-muted-foreground mt-1.5 leading-snug">{bt.description}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
