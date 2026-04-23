import { Sheet, SheetContent } from "@/components/ui/sheet";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMove: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canMoveOrDelete: boolean;
}

export function WorkoutActionsSheet({
  open, onOpenChange, onMove, onEdit, onDelete, canMoveOrDelete,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-8 pt-4">
        <div className="flex flex-col">
          {canMoveOrDelete && (
            <button
              onClick={() => { onOpenChange(false); onMove(); }}
              className="px-6 py-4 text-left text-base text-foreground hover:bg-muted/50 active:bg-muted transition-colors border-b border-border"
            >
              Move To Another Day
            </button>
          )}
          <button
            onClick={() => { onOpenChange(false); onEdit(); }}
            className="px-6 py-4 text-left text-base text-foreground hover:bg-muted/50 active:bg-muted transition-colors border-b border-border"
          >
            Edit This Workout
          </button>
          {canMoveOrDelete && (
            <button
              onClick={() => { onOpenChange(false); onDelete(); }}
              className="px-6 py-4 text-left text-base text-destructive hover:bg-muted/50 active:bg-muted transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}