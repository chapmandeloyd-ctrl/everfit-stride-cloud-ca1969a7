import { useAuth } from "@/hooks/useAuth";

/**
 * Returns the effective client ID for client-side pages.
 * When a trainer is impersonating a client (stored in localStorage),
 * this returns the impersonated client's ID instead of the logged-in user's ID.
 */
export function useEffectiveClientId() {
  const { user, userRole } = useAuth();

  const impersonatedId = localStorage.getItem("impersonatedClientId");

  // Only honor impersonation when trainer role is fully confirmed
  // (not while role is still null/loading) to prevent stale preview after session restart
  if (impersonatedId && userRole === "trainer") {
    return impersonatedId;
  }

  return user?.id;
}
