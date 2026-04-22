import { useState } from "react";
import { Bug, Check } from "lucide-react";

/**
 * Floating dev button that captures a one-time device telemetry snapshot
 * and copies it to the clipboard. Useful when reproducing performance
 * issues on mobile Safari — tap when the issue happens, then paste the
 * JSON into chat or a bug report.
 *
 * Renders nothing in production builds.
 */
export function DeviceTelemetryButton() {
  const [copied, setCopied] = useState(false);

  if (!import.meta.env.DEV) return null;

  const handleCopy = async () => {
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { effectiveType?: string; downlink?: number; rtt?: number };
    };

    const snapshot = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      device: {
        deviceMemory: nav.deviceMemory ?? null,
        hardwareConcurrency: nav.hardwareConcurrency ?? null,
        platform: nav.platform,
        userAgent: nav.userAgent,
      },
      viewport: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        orientation: window.screen?.orientation?.type ?? null,
      },
      network: nav.connection
        ? {
            effectiveType: nav.connection.effectiveType ?? null,
            downlink: nav.connection.downlink ?? null,
            rtt: nav.connection.rtt ?? null,
          }
        : null,
      memory:
        (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory
          ? {
              usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
              totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
              jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
            }
          : null,
    };

    const text = JSON.stringify(snapshot, null, 2);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback: log so user can manually copy from Safari console
      console.info("[DeviceTelemetry]", text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="fixed bottom-20 right-3 z-[100] flex items-center gap-1.5 rounded-full bg-foreground/80 px-3 py-2 text-[11px] font-medium text-background shadow-lg backdrop-blur-sm active:scale-95 transition-transform"
      aria-label="Copy device telemetry snapshot"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Bug className="w-3.5 h-3.5" />}
      {copied ? "Copied" : "Device info"}
    </button>
  );
}