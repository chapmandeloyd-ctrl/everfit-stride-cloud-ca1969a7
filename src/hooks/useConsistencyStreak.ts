import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { getStreakTier, getWeeklyLabel, type StreakTierInfo } from "@/lib/streakTiers";
import type { DailyScoreLabel } from "@/hooks/useDailyScore";

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastScoredDate: string | null;
  lastScoreLabel: string | null;
  perfectDaysCount: number;
  currentTier: string;
  tierInfo: StreakTierInfo;
  weeklyCompletion: number;
  weeklyLabel: { label: string; color: string };
  milestone3: boolean;
  milestone7: boolean;
  milestone14: boolean;
  milestone30: boolean;
  nextMilestone: { days: number; label: string } | null;
}

const MILESTONES = [
  { days: 3, key: "milestone_3" as const, label: "Unlock more meals" },
  { days: 7, key: "milestone_7" as const, label: "Full meal library" },
  { days: 14, key: "milestone_14" as const, label: "Advanced protocols" },
  { days: 30, key: "milestone_30" as const, label: "KSOM Elite status" },
];

export function useConsistencyStreak() {
  const clientId = useEffectiveClientId();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];

  const query = useQuery({
    queryKey: ["consistency-streak", clientId],
    queryFn: async (): Promise<StreakData> => {
      if (!clientId) throw new Error("No client");

      const { data, error } = await supabase
        .from("client_consistency_streaks" as any)
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();

      if (error) throw error;

      const row = data as any;
      if (!row) {
        const tierInfo = getStreakTier(0);
        return {
          currentStreak: 0,
          longestStreak: 0,
          lastScoredDate: null,
          lastScoreLabel: null,
          perfectDaysCount: 0,
          currentTier: "Starter",
          tierInfo,
          weeklyCompletion: 0,
          weeklyLabel: getWeeklyLabel(0),
          milestone3: false,
          milestone7: false,
          milestone14: false,
          milestone30: false,
          nextMilestone: MILESTONES[0] ? { days: MILESTONES[0].days, label: MILESTONES[0].label } : null,
        };
      }

      const current = row.current_streak || 0;
      const tierInfo = getStreakTier(current);
      const next = MILESTONES.find(m => current < m.days);
      const weeklyPct = row.weekly_completion || 0;

      return {
        currentStreak: current,
        longestStreak: row.longest_streak || 0,
        lastScoredDate: row.last_scored_date,
        lastScoreLabel: row.last_score_label,
        perfectDaysCount: row.perfect_days_count || 0,
        currentTier: row.current_tier || "Starter",
        tierInfo,
        weeklyCompletion: weeklyPct,
        weeklyLabel: getWeeklyLabel(weeklyPct),
        milestone3: row.milestone_3,
        milestone7: row.milestone_7,
        milestone14: row.milestone_14,
        milestone30: row.milestone_30,
        nextMilestone: next ? { days: next.days, label: next.label } : null,
      };
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });

  const recordScore = useMutation({
    mutationFn: async ({
      scoreLabel,
      dailyScore,
      fastingCompleted,
    }: {
      scoreLabel: DailyScoreLabel;
      dailyScore: number;
      fastingCompleted: boolean;
    }) => {
      if (!clientId) throw new Error("No client");

      const { data: existing } = await supabase
        .from("client_consistency_streaks" as any)
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();

      const row = existing as any;
      const alreadyScored = row?.last_scored_date === today;
      if (alreadyScored) return { action: "already_scored" as const, newStreak: row?.current_streak || 0 };

      let prevStreak = row?.current_streak || 0;
      let newStreak: number;

      // CORE RULE: increment if fasting completed AND score ≥ 70, else reset
      if (fastingCompleted && dailyScore >= 70) {
        newStreak = prevStreak + 1;
      } else {
        newStreak = 0;
      }

      const longestStreak = Math.max(newStreak, row?.longest_streak || 0);
      const isPerfectDay = dailyScore >= 90;
      const perfectDays = (row?.perfect_days_count || 0) + (isPerfectDay ? 1 : 0);
      const tierInfo = getStreakTier(newStreak);

      const updates = {
        client_id: clientId,
        current_streak: newStreak,
        longest_streak: longestStreak,
        last_scored_date: today,
        last_score_label: scoreLabel,
        perfect_days_count: perfectDays,
        current_tier: tierInfo.tier,
        fasting_completed_today: fastingCompleted,
        milestone_3: newStreak >= 3 || (row?.milestone_3 ?? false),
        milestone_7: newStreak >= 7 || (row?.milestone_7 ?? false),
        milestone_14: newStreak >= 14 || (row?.milestone_14 ?? false),
        milestone_30: newStreak >= 30 || (row?.milestone_30 ?? false),
      };

      if (row) {
        await supabase
          .from("client_consistency_streaks" as any)
          .update(updates)
          .eq("client_id", clientId);
      } else {
        await supabase
          .from("client_consistency_streaks" as any)
          .insert(updates);
      }

      const action = newStreak > prevStreak ? "incremented" as const : "reset" as const;
      return { action, newStreak, isPerfectDay };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consistency-streak", clientId] });
    },
  });

  return { ...query, recordScore };
}
