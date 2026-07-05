import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useImpersonation } from "@/hooks/useImpersonation";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("trainer" | "client")[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, userRole, loading } = useAuth();
  const location = useLocation();
  const { isImpersonating } = useImpersonation();

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
