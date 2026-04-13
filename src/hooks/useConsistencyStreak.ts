import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import type { DailyScoreLabel } from "@/hooks/useDailyScore";

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastScoredDate: string | null;
  lastScoreLabel: string | null;
  milestone3: boolean;
  milestone7: boolean;
  milestone14: boolean;
  milestone30: boolean;
  nextMilestone: { days: number; label: string } | null;
}

const MILESTONES = [
  { days: 3, key: "milestone_3" as const, label: "Unlock more meals" },
  { days: 7, key: "milestone_7" as const, label: "Full meal access" },
  { days: 14, key: "milestone_14" as const, label: "Elite badge" },
  { days: 30, key: "milestone_30" as const, label: "Mastery status" },
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
        return {
          currentStreak: 0,
          longestStreak: 0,
          lastScoredDate: null,
          lastScoreLabel: null,
          milestone3: false,
          milestone7: false,
          milestone14: false,
          milestone30: false,
          nextMilestone: MILESTONES[0] ? { days: MILESTONES[0].days, label: MILESTONES[0].label } : null,
        };
      }

      const current = row.current_streak || 0;
      const next = MILESTONES.find(m => current < m.days);

      return {
        currentStreak: current,
        longestStreak: row.longest_streak || 0,
        lastScoredDate: row.last_scored_date,
        lastScoreLabel: row.last_score_label,
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
    mutationFn: async (scoreLabel: DailyScoreLabel) => {
      if (!clientId) throw new Error("No client");

      // Get current streak data
      const { data: existing } = await supabase
        .from("client_consistency_streaks" as any)
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();

      const row = existing as any;
      const alreadyScored = row?.last_scored_date === today;
      if (alreadyScored) return; // Already scored today

      let newStreak = row?.current_streak || 0;

      if (scoreLabel === "Perfect Day") {
        newStreak += 1;
      } else if (scoreLabel === "Strong Day") {
        // Maintain — no change
      } else if (scoreLabel === "Reset Needed") {
        newStreak = 0;
      }
      // "Off Track" = warning, no change

      const longestStreak = Math.max(newStreak, row?.longest_streak || 0);

      const updates = {
        client_id: clientId,
        current_streak: newStreak,
        longest_streak: longestStreak,
        last_scored_date: today,
        last_score_label: scoreLabel,
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consistency-streak", clientId] });
    },
  });

  return { ...query, recordScore };
}
