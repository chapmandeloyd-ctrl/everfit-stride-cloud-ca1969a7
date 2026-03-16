import { useAuth } from "./useAuth";

/**
 * Returns the effective client ID — either the impersonated client (for trainers)
 * or the current user's own ID.
 */
export function useEffectiveClientId(): string | null {
  const { user, userRole } = useAuth();
  
  if (userRole === "trainer") {
    const impersonated = localStorage.getItem("impersonatedClientId");
    if (impersonated) return impersonated;
  }
  
  return user?.id ?? null;
}
