import { Flame, FileDown } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { exportKetoPlanPdf } from "@/lib/pdf/exportKetoPlan";
import { useClientPdfBranding } from "@/hooks/useTrainerPdfBranding";
import {
  InteractiveProtocolCard,
  type InteractiveProtocolCardProps,
} from "@/components/plan/InteractiveProtocolCard";
import type { DemoProtocol } from "@/components/plan/InteractiveProtocolCardDemo";
import type { ProtocolCardContent } from "@/lib/protocolCardContent";

export interface KetoTypeForCard {
  abbreviation: string;
  name: string;
  subtitle?: string | null;
  description?: string | null;
  difficulty?: "beginner" | "intermediate" | "advanced" | string | null;
  fat_pct: number;
  protein_pct: number;
  carbs_pct: number;
  carb_limit_grams?: number | null;
  how_it_works?: string | null;
  built_for?: string[] | null;
  /** Optional hex color (e.g. "#E4572E"). Used to pick the closest tailwind palette. */
  color?: string | null;
}

export interface InteractiveKetoTypeCardProps {
  ketoType: KetoTypeForCard;
  /** Theme color (hex). Defaults to the ketoType.color or a red fallback. */
  themeColor?: string;
  /** Optional secondary action shown on the back face. */
  onOpen?: () => void;
  openLabel?: string;
  /** Mark this keto type as the client's active one (shows "Current" pill on the front). */
  isCurrent?: boolean;
  flipCancelHorizontalPx?: InteractiveProtocolCardProps["flipCancelHorizontalPx"];
  flipCancelVerticalPx?: InteractiveProtocolCardProps["flipCancelVerticalPx"];
  /** Pass-through: force a uniform card height across a list. */
  forcedHeight?: InteractiveProtocolCardProps["forcedHeight"];
  /** Pass-through: emits the auto-measured height for parent to collect. */
  onMeasureHeight?: InteractiveProtocolCardProps["onMeasureHeight"];
  /** Client display name pulled into the PDF footer ("Prepared for ..."). */
  clientName?: string | null;
  /** Optional pull-quote shown in the PDF "Coach Read" block. */
  coachRead?: string | null;
  /** Hide the back-face "Export PDF" chip. Default: false (button is shown). */
  hideExportPdf?: boolean;
}

/* ----------------------------- color mapping ----------------------------- */

type Palette = {
  iconGradient: string;
  accentColorClass: string;
  surfaceTintGradient: string;
};

const PALETTES: Record<string, Palette> = {
  red: {
    iconGradient: "from-red-500 to-rose-600",
    accentColorClass: "text-red-500",
    surfaceTintGradient: "from-red-500/10 via-transparent to-transparent",
  },
  orange: {
    iconGradient: "from-orange-500 to-red-500",
    accentColorClass: "text-orange-500",
    surfaceTintGradient: "from-orange-500/10 via-transparent to-transparent",
  },
  amber: {
    iconGradient: "from-amber-500 to-orange-500",
    accentColorClass: "text-amber-500",
    surfaceTintGradient: "from-amber-500/10 via-transparent to-transparent",
  },
  yellow: {
    iconGradient: "from-yellow-500 to-amber-500",
    accentColorClass: "text-yellow-500",
    surfaceTintGradient: "from-yellow-500/10 via-transparent to-transparent",
  },
  green: {
    iconGradient: "from-emerald-500 to-green-600",
    accentColorClass: "text-emerald-500",
    surfaceTintGradient: "from-emerald-500/10 via-transparent to-transparent",
  },
  teal: {
    iconGradient: "from-teal-500 to-cyan-600",
    accentColorClass: "text-teal-500",
    surfaceTintGradient: "from-teal-500/10 via-transparent to-transparent",
  },
  blue: {
    iconGradient: "from-blue-500 to-indigo-600",
    accentColorClass: "text-blue-500",
    surfaceTintGradient: "from-blue-500/10 via-transparent to-transparent",
  },
  purple: {
    iconGradient: "from-violet-500 to-purple-600",
    accentColorClass: "text-violet-500",
    surfaceTintGradient: "from-violet-500/10 via-transparent to-transparent",
  },
  pink: {
    iconGradient: "from-pink-500 to-rose-500",
    accentColorClass: "text-pink-500",
    surfaceTintGradient: "from-pink-500/10 via-transparent to-transparent",
  },
};

function paletteFromHex(hex?: string | null): Palette {
  if (!hex) return PALETTES.red;
  const m = hex.replace("#", "").match(/^([0-9a-f]{6})$/i);
  if (!m) return PALETTES.red;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  if (s < 0.15) return PALETTES.blue;
  if (h < 15) return PALETTES.red;
  if (h < 35) return PALETTES.orange;
  if (h < 50) return PALETTES.amber;
  if (h < 70) return PALETTES.yellow;
  if (h < 165) return PALETTES.green;
  if (h < 200) return PALETTES.teal;
  if (h < 255) return PALETTES.blue;
  if (h < 310) return PALETTES.purple;
  if (h < 345) return PALETTES.pink;
  return PALETTES.red;
}

/* ----------------------------- content builder ----------------------------- */

function difficultyLabel(d?: string | null): string {
  if (d === "beginner") return "Beginner";
  if (d === "intermediate") return "Intermediate";
  if (d === "advanced") return "Advanced";
  return "Standard";
}

function buildContent(kt: KetoTypeForCard): ProtocolCardContent {
  const overview: string[] = [];
  if (kt.description) overview.push(kt.description);
  if (kt.how_it_works) overview.push(kt.how_it_works);
  if (overview.length === 0) {
    overview.push(
      `${kt.name} is a ketogenic approach designed to keep your body in fat-burning mode while matching your activity level and goals.`
    );
  }

  const phases = [
    {
      range: "Days 1–3",
      title: "Glycogen Drawdown",
      detail: `Carbs drop to ${kt.carbs_pct}% of intake (≤${kt.carb_limit_grams ?? 30}g net carbs). Insulin falls and your body starts spending stored glucose.`,
    },
    {
      range: "Days 3–7",
      title: "Fat Adaptation Begins",
      detail: `Fat rises to ${kt.fat_pct}% of intake. Hunger stabilizes, energy starts to even out, and ketones begin to appear.`,
    },
    {
      range: "Week 2",
      title: "Ketosis Locked In",
      detail: `Protein at ${kt.protein_pct}% protects lean mass while fat fuels training, focus, and daily output.`,
    },
    {
      range: "Week 3+",
      title: "Metabolic Flexibility",
      detail: "Steady fat burn, fewer cravings, and consistent energy across long days and training blocks.",
    },
  ];

  const benefits =
    kt.built_for && kt.built_for.length > 0
      ? kt.built_for
      : [
          "Steady fat loss without crashes",
          "Stable energy and appetite",
          "Mental clarity and focus",
          "Training-ready fueling pattern",
        ];

  const rules: string[] = [
    `Keep carbs at ${kt.carbs_pct}% of intake (≤${kt.carb_limit_grams ?? 30}g net carbs/day)`,
    `Hit fat at ~${kt.fat_pct}% of intake — don't fear the fat`,
    `Protein at ~${kt.protein_pct}% — enough to protect muscle, not so much it kicks you out of ketosis`,
    "Hydrate aggressively — water + sodium, potassium, magnesium",
    "Plan meals around the eating window — no random snacking",
  ];

  const mentalReality = [
    "Days 2–4 are usually the hardest — this is the keto adaptation curve.",
    "Once fat-adapted, hunger and energy flatten out. That's the goal.",
    "Stay consistent — most people quit one week before it gets easy.",
  ];

  const schedule = [
    { label: "Fat", detail: `${kt.fat_pct}% of daily calories` },
    { label: "Protein", detail: `${kt.protein_pct}% of daily calories` },
    { label: "Carbs", detail: `${kt.carbs_pct}% (≤${kt.carb_limit_grams ?? 30}g net)` },
    { label: "Difficulty", detail: difficultyLabel(kt.difficulty) },
  ];

  const coachWarning = [
    "Track for the first 2 weeks — guessing macros is the #1 reason people stall.",
    "If you train hard, prioritize electrolytes and don't undereat fat.",
  ];

  return { overview, phases, benefits, rules, mentalReality, schedule, coachWarning };
}

/* ----------------------------- component ----------------------------- */

/**
 * "Your Active Keto Type" — interactive flip card that matches the protocol card visuals 1:1.
 * Front  = eyebrow ("Your Active Keto Type"), abbreviation as the title, name + subtitle, macro stat tiles, coach quote space-filler, "Tap for details" pill.
 * Back   = full content (How it works, What your body is doing, What this does for you, Macro Schedule, Coach notes).
 */
export function InteractiveKetoTypeCard({
  ketoType,
  themeColor,
  onOpen,
  openLabel = "Open keto details",
  isCurrent = true,
  flipCancelHorizontalPx,
  flipCancelVerticalPx,
  forcedHeight,
  onMeasureHeight,
  clientName,
  coachRead,
  hideExportPdf = false,
}: InteractiveKetoTypeCardProps) {
  const palette = paletteFromHex(themeColor || ketoType.color);
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const { branding } = useClientPdfBranding();

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportKetoPlanPdf({
        ketoType,
        themeColor: themeColor || ketoType.color || null,
        clientName,
        coachRead,
        // Trainer's saved branding wins over the keto type's color so every
        // exported document looks the same regardless of which type is active.
        brandingAccentHex: branding.accent_color,
        branding: {
          showLogo: branding.show_logo,
          footerText: branding.footer_text,
          documentLabelOverride: branding.document_label_override,
        },
      });
      toast({
        title: "Plan exported",
        description: "Your keto plan PDF is downloading.",
      });
    } catch (err) {
      console.error("[keto export] failed", err);
      toast({
        title: "Export failed",
        description: "We couldn't generate your PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const exportAction = hideExportPdf ? undefined : (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        handleExport();
      }}
      disabled={exporting}
      className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground/80 hover:text-foreground hover:bg-background disabled:opacity-60 transition-colors"
      aria-label="Export plan as PDF"
    >
      <FileDown className="h-3 w-3" />
      {exporting ? "Exporting…" : "Export PDF"}
    </button>
  );

  const protocol: DemoProtocol = {
    id: `keto-${ketoType.abbreviation.toLowerCase()}`,
    icon: Flame,
    accentColorClass: palette.accentColorClass,
    iconGradient: palette.iconGradient,
    surfaceTintGradient: palette.surfaceTintGradient,
    eyebrow: "Your Active Keto Type",
    subEyebrow: ketoType.name,
    title: ketoType.abbreviation,
    titleSuffix: ketoType.subtitle ? ` — ${ketoType.subtitle}` : "",
    stats: [
      { value: `${ketoType.fat_pct}%`, label: "Fat", accentClass: palette.accentColorClass },
      { value: `${ketoType.protein_pct}%`, label: "Protein" },
      { value: `${ketoType.carbs_pct}%`, label: "Carbs" },
    ],
    status: isCurrent ? "current" : null,
    content: buildContent(ketoType),
  };

  return (
    <InteractiveProtocolCard
      protocol={protocol}
      frontExtra="coachQuote"
      onOpen={onOpen}
      openLabel={openLabel}
      flipCancelHorizontalPx={flipCancelHorizontalPx}
      flipCancelVerticalPx={flipCancelVerticalPx}
      forcedHeight={forcedHeight}
      onMeasureHeight={onMeasureHeight}
      backExtraAction={exportAction}
    />
  );
}
