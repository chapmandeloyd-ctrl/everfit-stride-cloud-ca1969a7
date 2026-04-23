import { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";

const IMPERSONATION_STORAGE_KEY = "impersonatedClientId";

interface ImpersonationContextType {
  /** The effective client ID to use — either the impersonated client or the logged-in user */
  effectiveClientId: string | undefined;
  /** Whether we're currently impersonating a client */
  isImpersonating: boolean;
  /** The impersonated client ID, if any */
  impersonatedClientId: string | null;
  /** Set/clear the impersonated client ID */
  setImpersonatedClientId: (id: string | null) => void;
}

const ImpersonationContext = createContext<ImpersonationContextType>({
  effectiveClientId: undefined,
  isImpersonating: false,
  impersonatedClientId: null,
  setImpersonatedClientId: () => {},
});

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [, forceSync] = useReducer((count: number) => count + 1, 0);

  const impersonatedClientId = localStorage.getItem(IMPERSONATION_STORAGE_KEY);

  useEffect(() => {
    forceSync();
  }, [location.key]);

  const setImpersonatedClientId = useCallback((id: string | null) => {
    if (id) {
      localStorage.setItem(IMPERSONATION_STORAGE_KEY, id);
    } else {
      localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
    }

    forceSync();
  }, []);

  const effectiveClientId = impersonatedClientId || user?.id;

  return (
    <ImpersonationContext.Provider
      value={{
        effectiveClientId,
        isImpersonating: !!impersonatedClientId,
        impersonatedClientId,
        setImpersonatedClientId,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  return useContext(ImpersonationContext);
}
