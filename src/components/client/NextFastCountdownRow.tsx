import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, X } from "lucide-react";
import { useScheduledFastGate } from "@/hooks/useScheduledFastGate";
import { useStartFast } from "@/hooks/useStartFast";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const PRESTART_CANCEL_MS = 5 * 60 * 1000;
const AUTO_START_CUTOFF_MS = 30 * 60 * 1000;

function fmt(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function todayKey(clientId: string | null | undefined): string {
  const d = new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `autostart_skipped_${clientId ?? "anon"}_${y}-${mo}-${da}`;
}

/**
 * Live countdown to the next scheduled fast start, rendered above the
 * "Open Live Schedule to Start" CTA. When the countdown hits zero we
 * shows a short cancel window before the scheduled time, then auto-starts via
 * the existing useStartFast() mutation when the scheduled moment arrives.
 */
export function NextFastCountdownRow({ accent = "hsl(var(--primary))" }: { accent?: string }) {
  const gate = useScheduledFastGate();
  const clientId = useEffectiveClientId();
  const startFast = useStartFast();
  const [now, setNow] = useState<number>(() => Date.now());
  const firedRef = useRef(false);

  // Read the last fast end time so we don't auto-restart a fast the user
  // just manually ended for this scheduled window.
  const { data: lastEnded } = useQuery({
    queryKey: ["ncr-last-ended", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_feature_settings")
        .select("last_fast_ended_at")
        .eq("client_id", clientId!)
        .maybeSingle();
      return (data as any)?.last_fast_ended_at as string | null;
    },
    enabled: !!clientId,
  });

  // Tick every second while mounted
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const scheduledAt = gate.scheduledAt;
  const scheduledMs = scheduledAt?.getTime() ?? null;

  // Render scheduled time in the client's configured timezone so it stays
  // consistent (e.g. "Sat 2:31 PM" for an EST client) regardless of the
  // device timezone.
  const { data: tzRow } = useQuery({
    queryKey: ["ncr-tz", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_feature_settings")
        .select("schedule_timezone")
        .eq("client_id", clientId!)
        .maybeSingle();
      return (data as any)?.schedule_timezone as string | null;
    },
    enabled: !!clientId,
  });

  // Persisted "skipped today" flag — localStorage keyed by client + local date
  const skipKey = useMemo(() => todayKey(clientId), [clientId, scheduledMs]);
  const [skipped, setSkipped] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(skipKey) === "1";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    setSkipped(window.localStorage.getItem(skipKey) === "1");
  }, [skipKey]);

  const msUntil = scheduledMs != null ? scheduledMs - now : Number.POSITIVE_INFINITY;
  const inGrace = scheduledMs != null && msUntil > 0 && msUntil <= PRESTART_CANCEL_MS;
  const graceRemaining = inGrace ? msUntil : 0;
  const withinAutoStartWindow = scheduledMs != null && msUntil <= 0 && msUntil >= -AUTO_START_CUTOFF_MS;

  // Per-scheduled-moment "already auto-started" key so the mutation cannot
  // re-fire after this component unmounts (e.g. after the user ends the
  // fast and the card remounts).
  const firedKey = useMemo(
    () => (scheduledMs != null && clientId ? `autostart_fired_${clientId}_${scheduledMs}` : null),
    [scheduledMs, clientId],
  );
  const alreadyFired =
    typeof window !== "undefined" && firedKey ? window.localStorage.getItem(firedKey) === "1" : false;

  // If the user manually ended a fast at/after this scheduled moment, treat
  // that scheduled window as already handled — do NOT auto-start again.
  const endedThisWindow = !!(
    scheduledMs != null &&
    lastEnded &&
    new Date(lastEnded).getTime() >= scheduledMs
  );

  // Auto-fire the mutation once when the scheduled moment arrives and user hasn't cancelled
  useEffect(() => {
    if (firedRef.current) return;
    if (skipped) return;
    if (alreadyFired) return;
    if (endedThisWindow) return;
    if (scheduledMs == null) return;
    if (!clientId) return;
    if (withinAutoStartWindow && !startFast.isPending) {
      firedRef.current = true;
      if (typeof window !== "undefined" && firedKey) {
        window.localStorage.setItem(firedKey, "1");
      }
      startFast.mutate();
    }
  }, [withinAutoStartWindow, skipped, startFast, scheduledMs, clientId, alreadyFired, endedThisWindow, firedKey]);

  // Don't render at all when we have no scheduled moment (fast day, refeed, no plan)
  if (!scheduledMs || gate.state === "n/a") return null;

  // Hide once we're well past the grace window (fast should now be active
  // and ActiveFastingTimer takes over the card).
  if (msUntil <= -AUTO_START_CUTOFF_MS) return null;

  // If the user already ended a fast for this scheduled window, hide the
  // countdown entirely — the "next" scheduled moment is tomorrow.
  if (endedThisWindow) return null;

  // Skipped state: quiet chip so the user knows we won't auto-start today
  if (skipped && !inGrace) {
    return (
      <div className="mb-2 flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 py-2 text-[10px] uppercase tracking-widest font-bold text-white/60">
        <Clock className="h-3 w-3" />
        Auto-start off for today
      </div>
    );
  }

  // Grace-window state: red pulse, cancel button
  if (inGrace) {
    return (
      <div className="mb-2 rounded-lg border border-primary/60 bg-primary/15 p-3 animate-pulse">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest font-black text-primary">
              Starting your fast in
            </p>
            <p className="text-2xl font-black tabular-nums text-white leading-none mt-1">
              {fmt(graceRemaining)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.localStorage.setItem(skipKey, "1");
              setSkipped(true);
              // Persist server-side so the auto-start cron skips today too.
              if (clientId) {
                const d = new Date();
                const y = d.getFullYear();
                const mo = String(d.getMonth() + 1).padStart(2, "0");
                const da = String(d.getDate()).padStart(2, "0");
                void supabase
                  .from("client_feature_settings")
                  .update({ auto_fast_skip_date: `${y}-${mo}-${da}` } as any)
                  .eq("client_id", clientId);
              }
            }}
            className="shrink-0 flex items-center gap-1.5 rounded-md border border-white/20 bg-black/40 px-3 py-2 text-[10px] uppercase tracking-widest font-bold text-white/90 hover:bg-black/60"
          >
            <X className="h-3 w-3" />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Normal countdown state (future scheduled start)
  const scheduledLabel = scheduledAt
    ? scheduledAt.toLocaleString(undefined, {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        timeZone: tzRow || undefined,
      })
    : gate.scheduledLabel ?? "";
  return (
    <div
      className="mb-2 flex items-center justify-between gap-3 rounded-lg border bg-white/5 px-3 py-2.5"
      style={{ borderColor: `${accent}55` }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Clock className={cn("h-4 w-4 shrink-0")} style={{ color: accent }} />
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-widest font-bold text-white/60 leading-none">
            Next fast starts in
          </p>
          <p className="text-sm font-black tabular-nums text-white mt-1 leading-none">
            {fmt(msUntil)}
          </p>
        </div>
      </div>
      <p className="text-[10px] text-white/60 text-right truncate max-w-[45%]">
        {scheduledLabel}
      </p>
    </div>
  );
}