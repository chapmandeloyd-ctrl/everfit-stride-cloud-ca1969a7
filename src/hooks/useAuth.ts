import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";
import type { ReactNode } from "react";

export type Profile = Tables<"profiles">;

const TOKEN_REFRESH_INTERVAL = 4 * 60 * 1000;

type UserRole = "trainer" | "client" | null;

// Diagnostic auth-event log. Keeps the last 100 events in localStorage under
// `authDebugLog` and mirrors to console so we can see flash/kick-out loops
// without needing the user to reproduce on demand. Read via
// `JSON.parse(localStorage.getItem('authDebugLog'))` in the browser.
const AUTH_LOG_KEY = "authDebugLog";
const AUTH_LOG_MAX = 100;
function logAuthEvent(kind: string, detail: Record<string, unknown> = {}) {
  try {
    const entry = {
      t: new Date().toISOString(),
      kind,
      route: typeof window !== "undefined" ? window.location.pathname : null,
      visible: typeof document !== "undefined" ? document.visibilityState : null,
      impersonated:
        typeof localStorage !== "undefined"
          ? localStorage.getItem("impersonatedClientId")
          : null,
      ...detail,
    };
    const raw = localStorage.getItem(AUTH_LOG_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown[]) : [];
    arr.push(entry);
    if (arr.length > AUTH_LOG_MAX) arr.splice(0, arr.length - AUTH_LOG_MAX);
    localStorage.setItem(AUTH_LOG_KEY, JSON.stringify(arr));
    // eslint-disable-next-line no-console
    console.info("[auth]", kind, entry);
  } catch {
    /* ignore quota / SSR */
  }
}

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
      logAuthEvent("interval-refresh");
      supabase.auth
        .refreshSession()
        .then(({ error }) => {
          if (error) logAuthEvent("interval-refresh-error", { message: error.message });
        })
        .catch((err) => {
          logAuthEvent("interval-refresh-throw", { message: String(err) });
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

      logAuthEvent("state-change", {
        event,
        hasSession: !!session,
        userId: session?.user?.id ?? null,
        initialResolved: initialSessionResolved.current,
      });

      setSession(session);

      if (!session) {
        // Ignore transient empty auth events during initial storage restore.
        if (!initialSessionResolved.current && event !== "SIGNED_OUT") {
          logAuthEvent("state-change-ignored-transient", { event });
          return;
        }

        // Only an explicit sign-out should end trainer preview mode. During
        // token restore/refresh the auth SDK can briefly emit an empty session;
        // clearing impersonation there is what caused the flash/kick-out loop.
        if (event === "SIGNED_OUT") {
          logAuthEvent("clear-impersonation", { reason: "SIGNED_OUT" });
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
      logAuthEvent("get-session-resolved", {
        hasSession: !!session,
        userId: session?.user?.id ?? null,
      });
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
        logAuthEvent("visibility-refresh");
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
    logAuthEvent("sign-out-called");
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
