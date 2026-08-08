import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { getLevelTier, pointsForLevel, dailyPoints, LEVEL_UNLOCKS, type LevelTierInfo } from "@/lib/ksom360Levels";

export interface LevelProgressionData {
  level: number;
  tierInfo: LevelTierInfo;
  completionPct: number;
  pointsToNext: number;
  totalPointsForLevel: number;
  currentPoints: number;
  nextUnlock: string | null;
}

export function useKsomLevelProgression() {
  const clientId = useEffectiveClientId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["ksom-level-progression", clientId],
    queryFn: async (): Promise<LevelProgressionData> => {
      if (!clientId) throw new Error("No client");

      const { data, error } = await supabase
        .from("client_feature_settings")
        .select("current_level, level_completion_pct, auto_level_advance_enabled")
        .eq("client_id", clientId)
        .maybeSingle();

      if (error) throw error;

      const level = data?.current_level ?? 1;
      const pct = data?.level_completion_pct ?? 0;
      const total = pointsForLevel(level);
      const current = Math.round((pct / 100) * total);

      // Find next unlock
      const nextUnlockLevel = Object.keys(LEVEL_UNLOCKS)
        .map(Number)
        .sort((a, b) => a - b)
        .find(l => l > level);

      return {
        level,
        tierInfo: getLevelTier(level),
        completionPct: pct,
        pointsToNext: total - current,
        totalPointsForLevel: total,
        currentPoints: current,
        nextUnlock: nextUnlockLevel ? LEVEL_UNLOCKS[nextUnlockLevel] : null,
      };
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });

  const addProgress = useMutation({
    mutationFn: async ({ scoreLabel, streak }: { scoreLabel: string; streak: number }) => {
      if (!clientId) return;

      const { data } = await supabase
        .from("client_feature_settings")
        .select("current_level, level_completion_pct, auto_level_advance_enabled")
        .eq("client_id", clientId)
        .maybeSingle();

      if (!data?.auto_level_advance_enabled) return;

      let level = data.current_level ?? 1;
      const total = pointsForLevel(level);
      let currentPts = Math.round(((data.level_completion_pct ?? 0) / 100) * total);

      const pts = dailyPoints(scoreLabel, streak);
      if (pts === 0) return; // No progress for Reset Needed

      currentPts += pts;

      let newLevel = level;
      let newPct: number;

      if (currentPts >= total) {
        newLevel = level + 1;
        const overflow = currentPts - total;
        const newTotal = pointsForLevel(newLevel);
        newPct = Math.min(Math.round((overflow / newTotal) * 100), 99);
      } else {
        newPct = Math.round((currentPts / total) * 100);
      }

      await supabase
        .from("client_feature_settings")
        .update({
          current_level: newLevel,
          level_completion_pct: newPct,
        })
        .eq("client_id", clientId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ksom-level-progression", clientId] });
    },
  });

  return { ...query, addProgress };
}
