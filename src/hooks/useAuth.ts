import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";
import type { ReactNode } from "react";

export type Profile = Tables<"profiles">;

const TOKEN_REFRESH_INTERVAL = 4 * 60 * 1000;

type UserRole = "trainer" | "client" | null;

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  userRole: UserRole;
  loading: boolean;
  signOut: () => Promise<void>;
  isTrainer: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialSessionResolved = useRef(false);
  const profileRequestId = useRef(0);

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
    const requestId = ++profileRequestId.current;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (requestId !== profileRequestId.current) return;
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

        // Only an explicit sign-out should end trainer preview mode. During
        // token restore/refresh the auth SDK can briefly emit an empty session;
        // clearing impersonation there is what caused the flash/kick-out loop.
        if (event === "SIGNED_OUT") {
          localStorage.removeItem("impersonatedClientId");
        }
        stopTokenRefresh();
        profileRequestId.current += 1;
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
        profileRequestId.current += 1;
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
    profileRequestId.current += 1;
    setProfile(null);
    await supabase.auth.signOut();
  };

  const user = session?.user ?? null;
  const userRole: UserRole = profile?.role as UserRole ?? null;

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user,
    profile,
    userRole,
    loading,
    signOut,
    isTrainer: profile?.role === "trainer",
  }), [session, user, profile, userRole, loading]);

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
