import { useState } from "react";
import { EmailBlock } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { GripVertical, Trash2, Plus, Type, AlignLeft, Image, Minus, Square, ArrowUp, ArrowDown, Heading } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailBlockEditorProps {
  blocks: EmailBlock[];
  onChange: (blocks: EmailBlock[]) => void;
}

const BLOCK_TYPES = [
  { type: "heading" as const, label: "Heading", icon: Heading },
  { type: "text" as const, label: "Text", icon: Type },
  { type: "button" as const, label: "Button", icon: Square },
  { type: "image" as const, label: "Image", icon: Image },
  { type: "divider" as const, label: "Divider", icon: Minus },
  { type: "spacer" as const, label: "Spacer", icon: AlignLeft },
];

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function createBlock(type: EmailBlock["type"]): EmailBlock {
  const base = { id: generateId(), type, content: "", alignment: "left" as const };
  switch (type) {
    case "heading": return { ...base, content: "Your Heading", level: 1 };
    case "text": return { ...base, content: "Your text content here..." };
    case "button": return { ...base, content: "Click Here", url: "https://", alignment: "center" };
    case "image": return { ...base, content: "", url: "", alt: "Image" };
    case "divider": return { ...base };
    case "spacer": return { ...base, height: 20 };
    default: return base;
  }
}

function BlockEditor({ block, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: {
  block: EmailBlock;
  onChange: (block: EmailBlock) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <Card className="p-3 border border-border group relative">
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-0.5 pt-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onMoveUp} disabled={isFirst}>
            <ArrowUp className="h-3 w-3" />
          </Button>
          <GripVertical className="h-4 w-4 text-muted-foreground mx-auto" />
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onMoveDown} disabled={isLast}>
            <ArrowDown className="h-3 w-3" />
          </Button>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {block.type}
            </span>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onDelete}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>

          {block.type === "heading" && (
            <div className="space-y-2">
              <Select
                value={String(block.level || 1)}
                onValueChange={(v) => onChange({ ...block, level: Number(v) as 1 | 2 | 3 })}
              >
                <SelectTrigger className="h-8 text-xs w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">H1</SelectItem>
                  <SelectItem value="2">H2</SelectItem>
                  <SelectItem value="3">H3</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={block.content}
                onChange={(e) => onChange({ ...block, content: e.target.value })}
                placeholder="Heading text"
                className="h-8 text-sm"
              />
            </div>
          )}

          {block.type === "text" && (
            <Textarea
              value={block.content}
              onChange={(e) => onChange({ ...block, content: e.target.value })}
              placeholder="Text content..."
              rows={3}
              className="text-sm resize-none"
            />
          )}

          {block.type === "button" && (
            <div className="space-y-2">
              <Input
                value={block.content}
                onChange={(e) => onChange({ ...block, content: e.target.value })}
                placeholder="Button text"
                className="h-8 text-sm"
              />
              <Input
                value={block.url || ""}
                onChange={(e) => onChange({ ...block, url: e.target.value })}
                placeholder="Button URL"
                className="h-8 text-sm"
              />
            </div>
          )}

          {block.type === "image" && (
            <div className="space-y-2">
              <Input
                value={block.url || ""}
                onChange={(e) => onChange({ ...block, url: e.target.value })}
                placeholder="Image URL"
                className="h-8 text-sm"
              />
              <Input
                value={block.alt || ""}
                onChange={(e) => onChange({ ...block, alt: e.target.value })}
                placeholder="Alt text"
                className="h-8 text-sm"
              />
            </div>
          )}

          {block.type === "spacer" && (
            <Input
              type="number"
              value={block.height || 20}
              onChange={(e) => onChange({ ...block, height: Number(e.target.value) })}
              placeholder="Height (px)"
              className="h-8 text-sm w-24"
              min={5}
              max={100}
            />
          )}
        </div>
      </div>
    </Card>
  );
}

export function EmailBlockEditor({ blocks, onChange }: EmailBlockEditorProps) {
  const addBlock = (type: EmailBlock["type"]) => {
    onChange([...blocks, createBlock(type)]);
  };

  const updateBlock = (index: number, block: EmailBlock) => {
    const updated = [...blocks];
    updated[index] = block;
    onChange(updated);
  };

  const deleteBlock = (index: number) => {
    onChange(blocks.filter((_, i) => i !== index));
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    const updated = [...blocks];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => (
        <BlockEditor
          key={block.id}
          block={block}
          onChange={(b) => updateBlock(index, b)}
          onDelete={() => deleteBlock(index)}
          onMoveUp={() => moveBlock(index, -1)}
          onMoveDown={() => moveBlock(index, 1)}
          isFirst={index === 0}
          isLast={index === blocks.length - 1}
        />
      ))}

      <div className="flex flex-wrap gap-2 pt-2">
        {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            onClick={() => addBlock(type)}
            className="h-8 text-xs gap-1.5"
          >
            <Plus className="h-3 w-3" />
            <Icon className="h-3 w-3" />
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
