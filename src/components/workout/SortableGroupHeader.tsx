import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getBlockType } from "@/lib/workoutBlockTypes";
import { BlockCoachPanel } from "@/components/workout/BlockCoachPanel";

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
  introText?: string;
  onUpdateIntro?: (value: string) => void;
  waterBreakSeconds?: number;
  onUpdateWaterBreak?: (seconds: number) => void;
  coachVoiceId?: string | null;
  exerciseNames?: string[];
  exerciseCount?: number;
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
  introText,
  onUpdateIntro,
  waterBreakSeconds,
  onUpdateWaterBreak,
  coachVoiceId,
  exerciseNames = [],
  exerciseCount,
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
    <div ref={setNodeRef} style={style} className="border-b bg-muted/50">
    <div className="flex items-center gap-3 px-4 py-2">
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
    {onUpdateIntro && (
      <div className="flex items-center gap-2 px-4 pb-2">
        <Volume2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <Input
          value={introText || ""}
          onChange={(e) => onUpdateIntro(e.target.value)}
          placeholder="Coach intro spoken before this block (optional)"
          className="h-8 text-xs"
        />
      </div>
    )}
    </div>
  );
}
