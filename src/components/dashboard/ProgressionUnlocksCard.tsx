import { Card, CardContent } from "@/components/ui/card";
import { Lock, Sparkles } from "lucide-react";
import { useMealUnlockState, type MealRole, roleLabel } from "@/hooks/useMealUnlockState";
import { Progress } from "@/components/ui/progress";

const UNLOCK_ORDER: MealRole[] = ["break_fast", "mid_window", "last_meal"];

/**
 * Progression / Unlocks Card — shows next meal unlock milestone
 * with a progress bar and blurred preview of locked content.
 */
export function ProgressionUnlocksCard() {
  const { streak, unlockedRoles, isRoleLocked, unlockAtForRole, isFullyUnlocked } = useMealUnlockState();

  // Find the next locked role
  const nextLocked = UNLOCK_ORDER.find((r) => isRoleLocked(r));
  const nextUnlockAt = nextLocked ? unlockAtForRole(nextLocked) : null;

  // If fully unlocked, don't show the card
  if (isFullyUnlocked) return null;

  const progressPct = nextUnlockAt ? Math.min((streak / nextUnlockAt) * 100, 100) : 0;
  const daysLeft = nextUnlockAt ? Math.max(nextUnlockAt - streak, 0) : 0;

  return (
    <Card className="border-border/60 overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-bold">Next Unlock</h3>
        </div>

        {nextLocked && nextUnlockAt && (
          <>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {daysLeft} day{daysLeft !== 1 ? "s" : ""} to unlock
              </span>
              <span className="font-semibold text-foreground">
                {roleLabel(nextLocked)} Meals
              </span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </>
        )}

        {/* Blurred preview of locked roles */}
        <div className="flex gap-2 mt-1">
          {UNLOCK_ORDER.map((role) => {
            const locked = isRoleLocked(role);
            return (
              <div
                key={role}
                className={`flex-1 rounded-lg border px-3 py-2 text-center text-[10px] font-semibold transition-all ${
                  locked
                    ? "border-border/40 bg-muted/20 text-muted-foreground blur-[2px] select-none"
                    : "border-primary/20 bg-primary/5 text-primary"
                }`}
              >
                {locked && <Lock className="h-3 w-3 mx-auto mb-0.5 text-muted-foreground" />}
                {roleLabel(role)}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
