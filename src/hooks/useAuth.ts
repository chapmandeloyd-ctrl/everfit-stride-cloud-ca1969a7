import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";
import type { ReactNode } from "react";
import { toast } from "sonner";

export type Profile = Tables<"profiles">;

const SESSION_LOSS_GRACE_MS = 8 * 1000;
// Only nudge a refresh when the access token is genuinely close to expiring.
// Supabase's own autoRefreshToken handles the normal cadence; racing it with
// extra refreshSession() calls invalidates the rotated refresh token and logs
// the user out.
const NEAR_EXPIRY_MS = 60 * 1000;
const VISIBILITY_THROTTLE_MS = 30 * 1000;

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
  const lastVisibilityCheck = useRef(0);
  const sessionRecoveryTimer = useRef<number | null>(null);
  const sessionRecoveryRequestId = useRef(0);
  const initialSessionResolved = useRef(false);
  const profileRequestId = useRef(0);

  const clearSessionRecovery = useCallback(() => {
    sessionRecoveryRequestId.current += 1;
    if (sessionRecoveryTimer.current) {
      clearTimeout(sessionRecoveryTimer.current);
      sessionRecoveryTimer.current = null;
    }
  }, []);

  const stopTokenRefresh = useCallback(() => {
    if (refreshTimer.current) {
      clearInterval(refreshTimer.current);
      refreshTimer.current = null;
    }
  }, []);

  const startTokenRefresh = useCallback(() => {
    // No-op: the Supabase client is configured with autoRefreshToken, which
    // owns token rotation. Kept as a hook so call sites stay unchanged.
    stopTokenRefresh();
  }, [stopTokenRefresh]);

  const fetchProfile = useCallback(async (userId: string) => {
    const requestId = ++profileRequestId.current;
    // Never let a hung network request keep the app on a spinner forever.
    const query = supabase.from("profiles").select("*").eq("id", userId).single();
    const timeout = new Promise<{ data: null }>((resolve) =>
      setTimeout(() => resolve({ data: null }), 8000),
    );
    let data: Profile | null = null;
    try {
      const result = (await Promise.race([query, timeout])) as { data: Profile | null };
      data = result?.data ?? null;
    } catch {
      data = null;
    }

    if (requestId !== profileRequestId.current) return;
    setProfile(data);
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

      if (!session) {
        // Ignore transient empty auth events during initial storage restore.
        if (!initialSessionResolved.current && event !== "SIGNED_OUT") {
          logAuthEvent("state-change-ignored-transient", { event });
          return;
        }

        if (event !== "SIGNED_OUT") {
          const requestId = ++sessionRecoveryRequestId.current;
          setLoading(true);
          logAuthEvent("state-change-session-loss-grace", { event, graceMs: SESSION_LOSS_GRACE_MS });

          if (sessionRecoveryTimer.current) clearTimeout(sessionRecoveryTimer.current);
          sessionRecoveryTimer.current = window.setTimeout(() => {
            supabase.auth
              .getSession()
              .then(({ data: { session: recoveredSession } }) => {
                if (cancelled || requestId !== sessionRecoveryRequestId.current) return;

                if (recoveredSession) {
                  logAuthEvent("session-loss-recovered", {
                    userId: recoveredSession.user.id,
                  });
                  setSession(recoveredSession);
                  startTokenRefresh();
                  void fetchProfile(recoveredSession.user.id);
                  return;
                }

                logAuthEvent("session-loss-confirmed", { event });
                stopTokenRefresh();
                profileRequestId.current += 1;
                setSession(null);
                setProfile(null);
                setLoading(false);
                try {
                  toast.error("Your session expired — please sign in again.", { id: "session-expired" });
                } catch {}
              })
              .catch((err) => {
                if (cancelled || requestId !== sessionRecoveryRequestId.current) return;
                logAuthEvent("session-loss-check-error", { message: String(err) });
                stopTokenRefresh();
                profileRequestId.current += 1;
                setSession(null);
                setProfile(null);
                setLoading(false);
              });
          }, SESSION_LOSS_GRACE_MS);
          return;
        }

        // Only an explicit sign-out should end trainer preview mode. During
        // token restore/refresh the auth SDK can briefly emit an empty session;
        // clearing impersonation there is what caused the flash/kick-out loop.
        clearSessionRecovery();
        logAuthEvent("clear-impersonation", { reason: "SIGNED_OUT" });
        localStorage.removeItem("impersonatedClientId");
        stopTokenRefresh();
        profileRequestId.current += 1;
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      clearSessionRecovery();
      setSession(session);
      startTokenRefresh();
      window.setTimeout(() => {
        if (!cancelled) void fetchProfile(session.user.id);
      }, 0);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;

      initialSessionResolved.current = true;
      clearSessionRecovery();
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
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastVisibilityCheck.current < VISIBILITY_THROTTLE_MS) return;
      lastVisibilityCheck.current = now;

      // getSession() reads storage and only refreshes when actually expired,
      // so it never burns a still-valid refresh token.
      supabase.auth
        .getSession()
        .then(({ data: { session: current } }) => {
          if (cancelled || !current) return;
          const expiresAtMs = (current.expires_at ?? 0) * 1000;
          if (expiresAtMs - Date.now() > NEAR_EXPIRY_MS) return;
          logAuthEvent("visibility-near-expiry-refresh");
          supabase.auth.refreshSession().catch(() => {});
        })
        .catch(() => {});
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      clearSessionRecovery();
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibility);
      stopTokenRefresh();
    };
  }, [clearSessionRecovery, fetchProfile, startTokenRefresh, stopTokenRefresh]);

  const signOut = async () => {
    logAuthEvent("sign-out-called");
    clearSessionRecovery();
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
