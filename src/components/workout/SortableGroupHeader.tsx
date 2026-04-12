import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getBlockType } from "@/lib/workoutBlockTypes";

interface SortableGroupHeaderProps {
  groupId: string;
  groupType: "superset" | "circuit";
  blockNumber: number;
  sets: number;
  allSelected: boolean;
  onToggleSelectAll: () => void;
  onUpdateSets: (sets: number) => void;
  onUngroup: () => void;
  blockTypeId?: string;
  customName?: string;
}

export function SortableGroupHeader({
  groupId,
  groupType,
  blockNumber,
  sets,
  allSelected,
  onToggleSelectAll,
  onUpdateSets,
  onUngroup,
  blockTypeId,
  customName,
}: SortableGroupHeaderProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `group-${groupId}`,
  });

  const bt = getBlockType(blockTypeId || "custom");
  const blockLabel = blockTypeId === "custom" && customName ? customName : bt.label;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 px-4 py-2 border-b bg-muted/50">
      <Checkbox checked={allSelected} onCheckedChange={onToggleSelectAll} />
      <span className="text-lg">{bt.emoji}</span>
      {groupType === "superset" ? (
        <>
          <span className="text-sm font-semibold text-muted-foreground">{blockLabel}</span>
          <span className="text-sm text-muted-foreground">·</span>
        </>
      ) : (
        <span className="text-sm text-muted-foreground">Circuit of</span>
      )}
      <Input
        type="number"
        value={sets}
        onChange={(e) => onUpdateSets(parseInt(e.target.value) || 1)}
        className="h-7 w-14 text-sm text-center"
        min={1}
      />
      <span className="text-sm text-muted-foreground">
        {groupType === "superset" ? "rounds" : "sets"}
      </span>
      <div className="flex-1" />
      <Button variant="link" size="sm" className="text-primary text-xs p-0 h-auto" onClick={onUngroup}>
        Ungroup
      </Button>
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}
