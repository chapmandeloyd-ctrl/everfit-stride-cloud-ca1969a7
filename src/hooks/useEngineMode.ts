import { APEXBEAST_ENGINE, type EngineMode } from "@/lib/engineConfig";

/**
 * APEXBEAST-IF has a single engine. This hook is kept as a thin
 * compatibility shim so existing call sites keep working.
 */
export function useEngineMode() {
  return {
    engineMode: "metabolic" as EngineMode,
    config: APEXBEAST_ENGINE,
    isLoading: false,
    setEngineMode: (_mode?: EngineMode) => {},
    isUpdating: false,
  };
}
