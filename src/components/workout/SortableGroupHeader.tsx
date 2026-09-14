import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
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
  onDeleteBlock?: () => void;
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
      <span
        className={`h-8 w-8 rounded-lg flex items-center justify-center text-base ${bt.color} border ${bt.borderColor}`}
      >
        {bt.emoji}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">{blockLabel}</p>
        {typeof exerciseCount === "number" && (
          <p className="text-[11px] text-muted-foreground">
            {exerciseCount} {exerciseCount === 1 ? "exercise" : "exercises"}
          </p>
        )}
      </div>
      <span className="text-xs text-muted-foreground ml-2">
        {groupType === "superset" ? "Rounds" : "Sets"}
      </span>
      <Input
        type="number"
        value={sets}
        onChange={(e) => onUpdateSets(parseInt(e.target.value) || 1)}
        className="h-7 w-14 text-sm text-center"
        min={1}
      />
      <div className="flex-1" />
      <Button variant="link" size="sm" className="text-primary text-xs p-0 h-auto" onClick={onUngroup}>
        Ungroup
      </Button>
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
    {onUpdateIntro && (
      <BlockCoachPanel
        blockLabel={blockLabel}
        exerciseNames={exerciseNames}
        introText={introText}
        onUpdateIntro={onUpdateIntro}
        waterBreakSeconds={waterBreakSeconds}
        onUpdateWaterBreak={onUpdateWaterBreak}
        coachVoiceId={coachVoiceId}
      />
    )}
    </div>
  );
}
