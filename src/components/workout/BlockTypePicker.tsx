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
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Add Workout Block</DialogTitle>
          <DialogDescription>Choose a block type to organize your workout</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
          {WORKOUT_BLOCK_TYPES.map((bt) => (
            <button
              key={bt.id}
              onClick={() => handleSelect(bt)}
              className={`flex flex-col items-center text-center p-4 rounded-xl border-2 transition-all hover:scale-[1.02] hover:shadow-md ${bt.borderColor} ${bt.color}`}
            >
              <span className="text-3xl mb-2">{bt.emoji}</span>
              <span className={`text-sm font-bold ${bt.textColor}`}>{bt.label}</span>
              <span className="text-[11px] text-muted-foreground mt-1 leading-tight">{bt.description}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
