import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Challenge, ExploreContent, UserChallenge } from "@/types/explore";
import { toast } from "sonner";

export function useExploreContent() {
  return useQuery({
    queryKey: ["explore-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("explore_content")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ExploreContent[];
    },
  });
}

export function useExploreContentById(id: string | undefined) {
  return useQuery({
    queryKey: ["explore-content", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("explore_content")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as ExploreContent | null;
    },
  });
}

export function useChallenges() {
  return useQuery({
    queryKey: ["challenges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Challenge[];
    },
  });
}

export function useChallengeById(id: string | undefined) {
  return useQuery({
    queryKey: ["challenge", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as Challenge | null;
    },
  });
}

export function useUserChallenges() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-challenges", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_challenges")
        .select("*, challenge:challenges(*)")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .order("joined_at", { ascending: false });
      if (error) throw error;
      return (data || []) as (UserChallenge & { challenge: Challenge })[];
    },
  });
}

export function useUserChallengeForChallenge(challengeId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-challenge", user?.id, challengeId],
    enabled: !!user?.id && !!challengeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_challenges")
        .select("*")
        .eq("user_id", user!.id)
        .eq("challenge_id", challengeId!)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data as UserChallenge | null;
    },
  });
}

export function useJoinChallenge() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (challengeId: string) => {
      if (!user?.id) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("user_challenges")
        .insert({
          user_id: user.id,
          challenge_id: challengeId,
          status: "active",
          progress_value: 0,
        })
        .select()
        .single();
      if (error) throw error;
      // Bump participant count optimistically (best-effort, no RLS for client)
      return data;
    },
    onSuccess: (_, challengeId) => {
      toast.success("You're in. Let's go.");
      qc.invalidateQueries({ queryKey: ["user-challenges"] });
      qc.invalidateQueries({ queryKey: ["user-challenge", user?.id, challengeId] });
    },
    onError: (e: any) => {
      toast.error(e?.message || "Could not join challenge");
    },
  });
}

export function useLeaveChallenge() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userChallengeId: string) => {
      const { error } = await supabase
        .from("user_challenges")
        .update({ status: "abandoned", abandoned_at: new Date().toISOString() })
        .eq("id", userChallengeId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Challenge left");
      qc.invalidateQueries({ queryKey: ["user-challenges"] });
      qc.invalidateQueries({ queryKey: ["user-challenge"] });
    },
  });
}

// ===== BOOKMARKS =====
export function useBookmarks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["bookmarks", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_bookmarks")
        .select("content_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set((data || []).map((r) => r.content_id as string));
    },
  });
}

export function useToggleBookmark() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ contentId, isBookmarked }: { contentId: string; isBookmarked: boolean }) => {
      if (!user?.id) throw new Error("Not signed in");
      if (isBookmarked) {
        const { error } = await supabase
          .from("user_bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("content_id", contentId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_bookmarks")
          .insert({ user_id: user.id, content_id: contentId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });
}

// ===== PROGRESS COMPUTATION =====
// Computes progress from existing fasting_sessions / sleep / movement data
// since the user joined the challenge.
export async function computeChallengeProgress(
  challenge: Challenge,
  userId: string,
  joinedAt: string
): Promise<number> {
  const since = new Date(joinedAt).toISOString();

  if (challenge.type === "fasting") {
    // Pull completed fasts since join
    const { data: sessions } = await supabase
      .from("fasting_log")
      .select("started_at, ended_at, actual_hours")
      .eq("client_id", userId)
      .gte("started_at", since)
      .not("ended_at", "is", null);

    const minHrs = Number(challenge.fast_minimum_hours || 12);
    const fasts = (sessions || []).filter((s: any) => Number(s.actual_hours || 0) >= minHrs);

    if (challenge.target_unit === "hours") {
      const total = fasts.reduce((sum: number, s: any) => sum + Number(s.actual_hours || 0), 0);
      return Math.round(total * 10) / 10;
    }
    // default: count of qualifying fasts
    return fasts.length;
  }

  // Sleep / movement / journal: fall back to 0 for now (can be wired later)
  return 0;
}

export function useComputedProgress(uc: (UserChallenge & { challenge: Challenge }) | undefined) {
  return useQuery({
    queryKey: ["uc-progress", uc?.id, uc?.joined_at],
    enabled: !!uc,
    queryFn: () => computeChallengeProgress(uc!.challenge, uc!.user_id, uc!.joined_at),
    staleTime: 60_000,
  });
}
