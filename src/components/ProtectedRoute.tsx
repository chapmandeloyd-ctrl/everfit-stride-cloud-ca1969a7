import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useImpersonation } from "@/hooks/useImpersonation";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("trainer" | "client")[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, userRole, loading, refreshProfile } = useAuth();
  const location = useLocation();
  const { isImpersonating } = useImpersonation();
  const [roleWaitExpired, setRoleWaitExpired] = useState(false);

  const needsRole = !loading && !!user && !!allowedRoles && !userRole;

  // New clients start "pending" (inactive). Once they're in with their own
  // password, flip them to active (once per browser session).
  useEffect(() => {
    if (!user || userRole !== "client" || isImpersonating) return;
    if (user.user_metadata?.must_change_password === true) return;
    const key = `client-activated-${user.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    void import("@/integrations/supabase/client").then(({ supabase }) =>
      supabase.functions.invoke("activate-client").catch(() => sessionStorage.removeItem(key))
    );
  }, [user, userRole, isImpersonating]);

  // Never spin forever waiting on a role: retry the profile once, then give up
  // and send the user back to sign-in instead of an endless loader.
  useEffect(() => {
    if (!needsRole) {
      setRoleWaitExpired(false);
      return;
    }
    const retry = window.setTimeout(() => {
      void refreshProfile();
    }, 2500);
    const bail = window.setTimeout(() => setRoleWaitExpired(true), 8000);
    return () => {
      clearTimeout(retry);
      clearTimeout(bail);
    };
  }, [needsRole, refreshProfile]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/auth?next=${encodeURIComponent(next)}`} replace />;
  }

  // Temporary password: block the app until the client sets their own
  if (user.user_metadata?.must_change_password === true) {
    return <Navigate to="/change-password" replace />;
  }

  // Allow trainers to access client routes while impersonating a client
  const isTrainerImpersonatingClient = userRole === "trainer" && isImpersonating;

  if (allowedRoles?.includes("client") && isTrainerImpersonatingClient) {
    return <>{children}</>;
  }

  // Guard: if userRole hasn't resolved yet (e.g. mid token refresh),
  // hold rendering instead of bouncing to the wrong dashboard. This prevents
  // the "flash → kicked back to admin" issue when previewing as a client.
  if (allowedRoles && !userRole) {
    if (roleWaitExpired) {
      const next = `${location.pathname}${location.search}`;
      return <Navigate to={`/auth?next=${encodeURIComponent(next)}`} replace />;
    }
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Enforce role-based access: redirect to the correct dashboard if role doesn't match
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    const redirectTo = userRole === "client" ? "/client/dashboard" : "/";
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
