import { Utensils, CupSoda, Pill, MessageSquare, Flag, type LucideIcon } from "lucide-react";

export type PlaybookStepType = "meal" | "drink" | "supplement" | "coaching" | "milestone";

export interface PlaybookStepTypeMeta {
  code: PlaybookStepType;
  label: string;
  icon: LucideIcon;
  /** Tailwind text color class */
  color: string;
  /** Tailwind bg + border tint */
  tint: string;
}

export const PLAYBOOK_STEP_TYPES: Record<PlaybookStepType, PlaybookStepTypeMeta> = {
  meal: {
    code: "meal",
    label: "Meal",
    icon: Utensils,
    color: "text-emerald-300",
    tint: "bg-emerald-500/15 border-emerald-500/30",
  },
  drink: {
    code: "drink",
    label: "Drink",
    icon: CupSoda,
    color: "text-sky-300",
    tint: "bg-sky-500/15 border-sky-500/30",
  },
  supplement: {
    code: "supplement",
    label: "Supplement",
    icon: Pill,
    color: "text-fuchsia-300",
    tint: "bg-fuchsia-500/15 border-fuchsia-500/30",
  },
  coaching: {
    code: "coaching",
    label: "Coaching",
    icon: MessageSquare,
    color: "text-amber-300",
    tint: "bg-amber-500/15 border-amber-500/30",
  },
  milestone: {
    code: "milestone",
    label: "Milestone",
    icon: Flag,
    color: "text-primary",
    tint: "bg-primary/15 border-primary/30",
  },
};

export const PLAYBOOK_STEP_TYPE_LIST = Object.values(PLAYBOOK_STEP_TYPES);

export function getStepTypeMeta(code: string | null | undefined): PlaybookStepTypeMeta {
  if (code && (code in PLAYBOOK_STEP_TYPES)) return PLAYBOOK_STEP_TYPES[code as PlaybookStepType];
  return PLAYBOOK_STEP_TYPES.coaching;
}