import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useClientComputedPlan } from "@/hooks/useClientComputedPlan";

/**
 * Scheduled fast start gate.
 *
 * Uses today's computed `eatEnd` as the scheduled fast start moment.
 * In the computed plan, `eatEnd` means "last meal by / fast starts".
 * When `enforce_scheduled_start` is ON, the Start Fast button is locked
 * outside the ready window (-30m → +60m of scheduled start).
 *
 * State:
 *  - "off"    : enforcement disabled, always ready
 *  - "early"  : too early, blocked, shows countdown
 *  - "ready"  : within grace window, primary CTA
 *  - "late"   : > 60m late, allowed but flagged
 *  - "n/a"    : fast day / refeed day / no plan — no fast-start time
 */
export type GateState = "off" | "early" | "ready" | "late" | "n/a";

const READY_LEAD_MIN = 30;   // enabled starting 30 min before scheduled
const LATE_AFTER_MIN = 60;   // > 60 min late → "late" warning

export interface ScheduledFastGate {
  state: GateState;
  scheduledAt: Date | null;
  scheduledLabel: string | null;
  minutesUntil: number;      // negative = past
  countdownLabel: string;    // "2h 14m" / "42m" / "3m"
}

function parseClockTo(dateBase: Date, clock: string, tz: string): Date {
  // clock: "8:00 PM" | "20:00" | "6:30 AM"
  const s = clock.trim().toUpperCase();
  const m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!m) return dateBase;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const mer = m[3];
  if (mer === "PM" && h < 12) h += 12;
  if (mer === "AM" && h === 12) h = 0;
  // Build a Date at (h,min) local to `tz` on today's date-in-tz
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dateBase);
  const y = parts.find((p) => p.type === "year")?.value ?? "2000";
  const mo = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  // Construct as if local tz then convert: use toLocaleString round-trip
  // Cheap approach: interpret components as if in `tz` by using the offset trick.
  const iso = `${y}-${mo}-${d}T${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`;
  const asIfUTC = new Date(iso + "Z");
  // shift by tz offset
  const tzOffsetMin = getTzOffsetMinutes(tz, asIfUTC);
  return new Date(asIfUTC.getTime() - tzOffsetMin * 60_000);
}

function getTzOffsetMinutes(tz: string, at: Date): number {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts = dtf.formatToParts(at);
    const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);
    const asUTC = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
      get("second")
    );
    return (asUTC - at.getTime()) / 60_000;
  } catch {
    return 0;
  }
}

function formatCountdown(minutes: number): string {
  const abs = Math.max(0, Math.round(Math.abs(minutes)));
  if (abs >= 60) {
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${h}h ${m}m`;
  }
  return `${abs}m`;
}

export function useScheduledFastGate(): ScheduledFastGate {
  const clientId = useEffectiveClientId();
  const { plan, dayIndex } = useClientComputedPlan();

  const { data: enforceRow } = useQuery({
    queryKey: ["ccp-enforce", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_feature_settings")
        .select("enforce_scheduled_start, schedule_timezone" as any)
        .eq("client_id", clientId!)
        .maybeSingle();
      return data as unknown as {
        enforce_scheduled_start: boolean | null;
        schedule_timezone: string | null;
      } | null;
    },
    enabled: !!clientId,
  });

  // Force re-render every 30s so countdowns tick
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const enforce = !!enforceRow?.enforce_scheduled_start;
  const tz = enforceRow?.schedule_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const today = plan?.days?.[dayIndex] ?? null;
  const hasScheduledStart = !!plan && !!today && !today.adFast && !today.isRefeed && !!today.eatEnd;
  const scheduledAt = hasScheduledStart ? parseClockTo(new Date(), today.eatEnd, tz) : null;
  const scheduledAtMs = scheduledAt?.getTime() ?? null;
  const minutesUntil = scheduledAtMs != null ? (scheduledAtMs - Date.now()) / 60_000 : 0;

  // Publish the next scheduled start to the server so the auto-start cron
  // can fire even when the app is closed. This effect must stay before any
  // conditional returns so React sees the same hook order on every render.
  useEffect(() => {
    if (!clientId) return;
    if (scheduledAtMs == null) return;
    if (!Number.isFinite(minutesUntil)) return;
    if (minutesUntil < -30 || minutesUntil > 60 * 24) return;
    const iso = new Date(scheduledAtMs).toISOString();
    const key = `nsfa_published_${clientId}`;
    if (typeof window !== "undefined" && window.sessionStorage.getItem(key) === iso) return;
    (async () => {
      const { error } = await supabase
        .from("client_feature_settings")
        .update({ next_scheduled_fast_at: iso, schedule_timezone: enforceRow?.schedule_timezone ?? tz } as any)
        .eq("client_id", clientId);
      if (!error && typeof window !== "undefined") {
        window.sessionStorage.setItem(key, iso);
      }
    })();
  }, [clientId, scheduledAtMs, enforceRow?.schedule_timezone, tz, minutesUntil]);

  if (!plan) {
    return { state: enforce ? "n/a" : "off", scheduledAt: null, scheduledLabel: null, minutesUntil: 0, countdownLabel: "" };
  }
  if (!today || today.adFast || today.isRefeed || !scheduledAt) {
    return { state: "n/a", scheduledAt: null, scheduledLabel: null, minutesUntil: 0, countdownLabel: "" };
  }

  if (!enforce) {
    return {
      state: "off",
      scheduledAt,
      scheduledLabel: today.eatEnd,
      minutesUntil,
      countdownLabel: formatCountdown(minutesUntil),
    };
  }

  let state: GateState;
  if (minutesUntil > READY_LEAD_MIN) state = "early";
  else if (minutesUntil < -LATE_AFTER_MIN) state = "late";
  else state = "ready";

  return {
    state,
    scheduledAt,
    scheduledLabel: today.eatEnd,
    minutesUntil,
    countdownLabel: formatCountdown(minutesUntil),
  };
}
