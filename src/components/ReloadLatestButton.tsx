import { RefreshCw } from "lucide-react";
import { useState } from "react";

export function ReloadLatestButton() {
  const [loading, setLoading] = useState(false);

  const handleReload = async () => {
    setLoading(true);
    try {
      // Unregister all service workers
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      // Clear all caches
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (e) {
      console.error("[ReloadLatest] cleanup failed", e);
    } finally {
      // Cache-busting reload
      const url = new URL(window.location.href);
      url.searchParams.set("_r", Date.now().toString());
      window.location.replace(url.toString());
    }
  };

  return (
    <button
      onClick={handleReload}
      disabled={loading}
      aria-label="Reload latest app"
      className="fixed bottom-24 right-4 z-[9999] flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/40 ring-2 ring-primary/30 transition-transform hover:scale-105 active:scale-95 disabled:opacity-70"
    >
      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Reloading…" : "Reload latest app"}
    </button>
  );
}