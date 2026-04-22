import { useMemo } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { InteractiveProtocolCard } from "@/components/plan/InteractiveProtocolCard";
import type { DemoProtocol } from "@/components/plan/InteractiveProtocolCardDemo";
import { CATEGORY_CONFIG, getDifficultyLabel } from "@/lib/fastingCategoryConfig";
import { getProtocolCardContent } from "@/lib/protocolCardContent";
import { getTierForLevel } from "@/lib/quickPlanTierConfig";
import { Zap } from "lucide-react";
import type { LibraryEntry } from "@/hooks/useProtocolLibrary";

interface ProtocolLibraryCarouselProps {
  entries: LibraryEntry[];
  currentLevel: number;
  selectedKey: string | null;
}

function buildDemoProtocol(entry: LibraryEntry, isLocked: boolean): DemoProtocol {
  const isQuickPlan = entry.source === "quick_plan";
  const category = (entry.raw as any).category as string | undefined;
  const config = category ? CATEGORY_CONFIG[category] : undefined;
  const tier = isQuickPlan ? getTierForLevel(entry.minLevelRequired) : null;

  const heroIcon = isQuickPlan ? tier!.icon : (config?.icon ?? Zap);
  const heroAccent = isQuickPlan ? tier!.accentColor : (config?.color ?? "text-primary");
  const heroIconGradient = isQuickPlan
    ? tier!.iconGradient
    : (config?.iconGradient ?? "from-primary via-primary to-primary");
  const heroTint = isQuickPlan
    ? tier!.surfaceTintGradient
    : (config?.surfaceTintGradient ?? "from-primary/15 via-transparent to-primary/10");
  const eyebrow = isQuickPlan
    ? `Level ${entry.minLevelRequired}`
    : (config?.label ?? "Protocol");
  const subEyebrow = isQuickPlan ? tier!.subtitle : "Adaptive Protocol";

  const exactDays = entry.fastTargetHours / 24;
  const titleSuffix =
    isQuickPlan && entry.fastTargetHours >= 24
      ? ` — ${Number.isInteger(exactDays) ? exactDays : Math.round(exactDays * 10) / 10} Day${exactDays === 1 ? "" : "s"}`
      : "";

  const durationLabel =
    entry.durationDays === 0
      ? "∞"
      : (() => {
          const wks = Math.ceil(entry.durationDays / 7);
          return `${wks} wk${wks !== 1 ? "s" : ""}`;
        })();

  return {
    id: entry.id,
    icon: heroIcon,
    accentColorClass: heroAccent,
    iconGradient: heroIconGradient,
    surfaceTintGradient: heroTint,
    eyebrow,
    subEyebrow,
    title: entry.name,
    titleSuffix,
    stats: [
      { value: `${entry.fastTargetHours}h`, label: "Fast", accentClass: heroAccent },
      { value: durationLabel, label: "Duration" },
      { value: getDifficultyLabel(entry.difficultyLabel), label: "Level" },
    ],
    status: isLocked ? "locked" : "current",
    content: getProtocolCardContent(entry.fastTargetHours, isQuickPlan),
  };
}

/**
 * Horizontal peek-snap carousel for the merged protocol library.
 *
 * - Each card is ~88% of the viewport width so the next card peeks ~10% on the right.
 * - Native CSS scroll-snap for buttery iOS swiping.
 * - Locked cards (above client's current level) show a Lock pill + toast on tap.
 */
export function ProtocolLibraryCarousel({ entries, currentLevel, selectedKey }: ProtocolLibraryCarouselProps) {
  const slides = useMemo(
    () => entries.map((entry) => ({
      entry,
      isLocked: entry.minLevelRequired > currentLevel,
      isCurrent: entry.key === selectedKey,
    })),
    [entries, currentLevel, selectedKey],
  );

  return (
    <div
      className="-mx-5 overflow-x-auto overflow-y-visible snap-x snap-mandatory scroll-smooth touch-pan-x"
      style={{
        scrollPaddingLeft: "1.25rem",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <style>{`
        .protocol-lib-scroller::-webkit-scrollbar { display: none; }
      `}</style>
      <div className="protocol-lib-scroller flex gap-3 px-5 pb-4">
        {slides.map(({ entry, isLocked, isCurrent }) => (
          <div
            key={entry.key}
            className="snap-start shrink-0 w-[88%] relative"
          >
            {isLocked && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toast(`Unlocks at Level ${entry.minLevelRequired}`, {
                    description: "Keep up your streak to unlock this protocol.",
                  });
                }}
                className="absolute top-3 right-3 z-30 flex items-center gap-1.5 rounded-full bg-foreground/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-background shadow-lg backdrop-blur-sm"
                aria-label={`Locked — unlocks at level ${entry.minLevelRequired}`}
              >
                <Lock className="w-3 h-3" />
                Lvl {entry.minLevelRequired}
              </button>
            )}
            <div className={isLocked ? "opacity-60 pointer-events-none-on-locked" : ""}>
              <InteractiveProtocolCard
                protocol={buildDemoProtocol(entry, isLocked)}
                dimmed={isLocked}
              />
            </div>
            {isCurrent && !isLocked && (
              <div className="absolute top-3 left-3 z-30 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-lg">
                Current
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}