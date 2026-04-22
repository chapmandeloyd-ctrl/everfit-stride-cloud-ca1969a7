import { useMemo, useState, useRef, useCallback } from "react";
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

  const [topIndex, setTopIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const lockedAxisRef = useRef<"x" | "y" | null>(null);

  const total = slides.length;
  if (total === 0) return null;

  const SWIPE_THRESHOLD = 90; // px to commit a swipe

  const advance = useCallback(
    (direction: 1 | -1) => {
      setIsAnimating(true);
      // Throw the top card off-screen, then swap & reset.
      setDragX(direction * 600);
      window.setTimeout(() => {
        setTopIndex((prev) => (prev + 1) % total);
        setDragX(0);
        setIsAnimating(false);
      }, 280);
    },
    [total],
  );

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (isAnimating) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    lockedAxisRef.current = null;
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging || startXRef.current === null || startYRef.current === null) return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;
    if (lockedAxisRef.current === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      lockedAxisRef.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (lockedAxisRef.current === "x") {
      e.preventDefault();
      setDragX(dx);
    }
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (lockedAxisRef.current === "x" && Math.abs(dragX) > SWIPE_THRESHOLD) {
      advance(dragX > 0 ? 1 : -1);
    } else {
      // Snap back
      setIsAnimating(true);
      setDragX(0);
      window.setTimeout(() => setIsAnimating(false), 200);
    }
    startXRef.current = null;
    startYRef.current = null;
    lockedAxisRef.current = null;
  };

  // Visible stack: top card + 2 behind it for depth (no peek — same size, hidden under).
  const STACK_DEPTH = 3;
  const stack = useMemo(() => {
    const arr: { slide: typeof slides[number]; offset: number }[] = [];
    for (let i = 0; i < Math.min(STACK_DEPTH, total); i++) {
      const idx = (topIndex + i) % total;
      arr.push({ slide: slides[idx], offset: i });
    }
    return arr;
  }, [slides, topIndex, total]);

  // Subtle rotation as user drags (Tinder feel).
  const rotation = Math.max(-12, Math.min(12, dragX / 14));

  return (
    <div className="px-5">
      <div
        className="relative w-full select-none"
        style={{ touchAction: "pan-y", minHeight: 460 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Render in reverse so the top card sits visually on top */}
        {stack
          .slice()
          .reverse()
          .map(({ slide, offset }) => {
            const { entry, isLocked, isCurrent } = slide;
            const isTop = offset === 0;

            const transform = isTop
              ? `translate3d(${dragX}px, 0, 0) rotate(${rotation}deg)`
              : `translate3d(0, 0, 0) scale(${1 - offset * 0.04})`;

            const style: CSSProperties = {
              transform,
              transition: isTop && !isDragging ? "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)" : "none",
              zIndex: STACK_DEPTH - offset,
              opacity: isTop ? 1 : 0,
              pointerEvents: isTop ? "auto" : "none",
            };

            return (
              <div
                key={`${entry.key}-${offset}`}
                className="absolute inset-x-0 top-0"
                style={style}
              >
                <div className="relative">
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
                  <div className={isLocked ? "opacity-60" : ""}>
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
              </div>
            );
          })}
      </div>

      {/* Pagination dots + position indicator */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium tabular-nums">
          {topIndex + 1} / {total}
        </span>
        <span className="opacity-60">· Swipe to browse</span>
      </div>
    </div>
  );
}