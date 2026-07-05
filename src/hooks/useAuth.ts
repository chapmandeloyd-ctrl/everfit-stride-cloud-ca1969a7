import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;

const TOKEN_REFRESH_INTERVAL = 4 * 60 * 1000;

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialSessionResolved = useRef(false);

  const stopTokenRefresh = useCallback(() => {
    if (refreshTimer.current) {
      clearInterval(refreshTimer.current);
      refreshTimer.current = null;
    }
  }, []);

  const startTokenRefresh = useCallback(() => {
    stopTokenRefresh();
    refreshTimer.current = setInterval(() => {
      supabase.auth.refreshSession().catch(() => {
        // The auth listener handles real session loss; avoid noisy redirects here.
      });
    }, TOKEN_REFRESH_INTERVAL);
  }, [stopTokenRefresh]);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    setProfile(data ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;

      setSession(session);

      if (!session) {
        // Ignore transient empty auth events during initial storage restore.
        if (!initialSessionResolved.current && event !== "SIGNED_OUT") return;

        localStorage.removeItem("impersonatedClientId");
        stopTokenRefresh();
        setProfile(null);
        setLoading(false);
        return;
      }

      startTokenRefresh();
      window.setTimeout(() => {
        if (!cancelled) void fetchProfile(session.user.id);
      }, 0);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;

      initialSessionResolved.current = true;
      setSession(session);

      if (!session) {
        setProfile(null);
        setLoading(false);
        stopTokenRefresh();
        return;
      }

      startTokenRefresh();
      void fetchProfile(session.user.id);
    });

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        supabase.auth.refreshSession().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibility);
      stopTokenRefresh();
    };
  }, [fetchProfile, startTokenRefresh, stopTokenRefresh]);

  const signOut = async () => {
    stopTokenRefresh();
    localStorage.removeItem("impersonatedClientId");
    setProfile(null);
    await supabase.auth.signOut();
  };

  const user = session?.user ?? null;
  const userRole: "trainer" | "client" | null = profile?.role as any ?? null;

  return {
    session,
    user,
    profile,
    userRole,
    loading,
    signOut,
    isTrainer: profile?.role === "trainer",
  };
}
