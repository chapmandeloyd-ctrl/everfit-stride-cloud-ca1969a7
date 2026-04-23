import { useEffect, useState, useRef, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

type UserRole = "trainer" | "client" | null;

const TOKEN_REFRESH_INTERVAL = 4 * 60 * 1000;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTokenRefresh = useCallback(() => {
    if (refreshTimer.current) clearInterval(refreshTimer.current);
    refreshTimer.current = setInterval(async () => {
      try {
        await supabase.auth.refreshSession();
      } catch {
        // silent — auth listener handles real expiry
      }
    }, TOKEN_REFRESH_INTERVAL);
  }, []);

  const stopTokenRefresh = useCallback(() => {
    if (refreshTimer.current) {
      clearInterval(refreshTimer.current);
      refreshTimer.current = null;
    }
  }, []);

  const fetchUserRole = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (!error && data) {
        setUserRole(data.role as UserRole);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (event === "SIGNED_OUT" || !nextSession) {
        localStorage.removeItem("impersonatedClientId");
        setUserRole(null);
        setLoading(false);
        stopTokenRefresh();
        return;
      }

      startTokenRefresh();

      if (nextSession.user) {
        setTimeout(() => {
          fetchUserRole(nextSession.user.id);
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (!initialSession?.user) {
        setLoading(false);
        return;
      }

      startTokenRefresh();
      fetchUserRole(initialSession.user.id);
    });

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        supabase.auth.refreshSession().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      subscription.unsubscribe();
      stopTokenRefresh();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchUserRole, startTokenRefresh, stopTokenRefresh]);

  const signOut = async () => {
    stopTokenRefresh();
    localStorage.removeItem("impersonatedClientId");
    await supabase.auth.signOut();
    setUserRole(null);
    navigate("/auth");
  };

  return { user, session, userRole, loading, signOut };
}
