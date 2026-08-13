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
