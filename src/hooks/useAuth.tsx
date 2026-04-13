import { useEffect, useState, useRef, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

type UserRole = "trainer" | "client" | null;

/** How often to proactively refresh the token (ms) — every 4 minutes */
const TOKEN_REFRESH_INTERVAL = 4 * 60 * 1000;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Proactive token refresh — keeps the session alive so it never silently expires
  const startTokenRefresh = useCallback(() => {
    if (refreshTimer.current) clearInterval(refreshTimer.current);
    refreshTimer.current = setInterval(async () => {
      try {
        await supabase.auth.refreshSession();
      } catch {
        // silent — onAuthStateChange will handle actual expiry
      }
    }, TOKEN_REFRESH_INTERVAL);
  }, []);

  const stopTokenRefresh = useCallback(() => {
    if (refreshTimer.current) {
      clearInterval(refreshTimer.current);
      refreshTimer.current = null;
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Clear stale impersonation on sign-out or session loss
        if (event === "SIGNED_OUT" || !session) {
          localStorage.removeItem("impersonatedClientId");
          setUserRole(null);
          setLoading(false);
          stopTokenRefresh();
          return;
        }

        // Clear impersonation on fresh sign-in so trainer lands on admin dashboard
        if (event === "SIGNED_IN") {
          localStorage.removeItem("impersonatedClientId");
        }

        // Start/restart proactive refresh whenever we have a valid session
        startTokenRefresh();

        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        }
      }
    );

    // Foreground recovery — when the app/tab comes back from background,
    // immediately refresh the token so the session doesn't appear expired
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
  }, [startTokenRefresh, stopTokenRefresh]);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setUserRole(data.role as UserRole);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    stopTokenRefresh();
    localStorage.removeItem("impersonatedClientId");
    await supabase.auth.signOut();
    setUserRole(null);
    navigate("/auth");
  };

  return { user, session, userRole, loading, signOut };
}
