import { useState, useEffect, useCallback } from "react";

/**
 * Polls the deployed index.html for new script hashes.
 * When a mismatch is detected, `updateAvailable` becomes true
 * so the UI can prompt the user to refresh.
 */
export function useAppUpdate(intervalMs = 5 * 60 * 1000) {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const extractScriptHashes = (html: string) => {
    const matches = html.match(/src="[^"]*\.js[^"]*"/g);
    return matches ? matches.sort().join("|") : "";
  };

  const checkForUpdate = useCallback(async () => {
    try {
      const resp = await fetch(`${window.location.origin}/index.html?_t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!resp.ok) return;
      const html = await resp.text();
      const remoteHash = extractScriptHashes(html);
      const storedHash = localStorage.getItem("app-script-hash");

      if (!storedHash) {
        // First visit — store the current hash
        localStorage.setItem("app-script-hash", remoteHash);
        return;
      }

      if (remoteHash && remoteHash !== storedHash) {
        setUpdateAvailable(true);
      }
    } catch {
      // network error — silently ignore
    }
  }, []);

  const applyUpdate = useCallback(() => {
    // Store the new hash before reloading
    // The next load will re-seed the hash
    localStorage.removeItem("app-script-hash");
    window.location.reload();
  }, []);

  useEffect(() => {
    // Check on mount
    checkForUpdate();

    // Poll periodically
    const id = setInterval(checkForUpdate, intervalMs);

    // Also check when tab becomes visible again
    const onVisibility = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [checkForUpdate, intervalMs]);

  return { updateAvailable, applyUpdate, checkForUpdate };
}
