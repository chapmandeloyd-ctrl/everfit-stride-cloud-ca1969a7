import { lazy } from "react";

type ModuleLoader<T extends { default: React.ComponentType<any> }> = () => Promise<T>;

const hasWindow = typeof window !== "undefined";

export function lazyRetry<T extends { default: React.ComponentType<any> }>(
  loader: ModuleLoader<T>,
  moduleName: string,
) {
  return lazy(async () => {
    const storageKey = `lazy-retry:${moduleName}`;

    try {
      const mod = await loader();
      if (hasWindow) {
        window.sessionStorage.removeItem(storageKey);
      }
      return mod;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isChunkFetchFailure =
        message.includes("Failed to fetch dynamically imported module") ||
        message.includes("Importing a module script failed");

      if (hasWindow && isChunkFetchFailure && !window.sessionStorage.getItem(storageKey)) {
        window.sessionStorage.setItem(storageKey, "1");
        window.location.reload();
        return new Promise<T>(() => undefined);
      }

      throw error;
    }
  });
}
