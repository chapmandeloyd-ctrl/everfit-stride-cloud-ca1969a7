import { useAuth } from "@/hooks/useAuth";

/**
 * Returns the effective client ID for client-side pages.
 * When a trainer is impersonating a client (stored in localStorage),
 * this returns the impersonated client's ID instead of the logged-in user's ID.
 */
export function useEffectiveClientId() {
  const { user, userRole, loading } = useAuth();

  const impersonatedId = localStorage.getItem("impersonatedClientId");

  if (!user) return undefined;

  // Freeze effective client resolution while auth/profile is still resolving.
  // This prevents a brief fallback to the trainer's own id, which causes
  // cross-page flicker and mixed trainer/client data during impersonation.
  if (impersonatedId) {
    if (loading || userRole === null) {
      return undefined;
    }

    if (userRole === "trainer") {
      return impersonatedId;
    }
  }

  return user.id;
}
