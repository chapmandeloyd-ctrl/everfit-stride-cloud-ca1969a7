// Runs every minute. For each client whose app has published a
// `next_scheduled_fast_at` (tonight's scheduled fast start), fires:
//
//   1. Heads-up push at t-5..t:
//        "Your fast starts in 5 min — tap CANCEL if you're still eating"
//   2. Auto-start at t..t+30 min:
//        Sets active_fast_start_at = scheduled moment (started_at reflects
//        the schedule, not the moment the cron fires). Sends a
//        confirmation push. Unless the client already tapped Cancel
//        (auto_fast_skip_date == scheduled date), in which case skip today.
//
// After t+30 min the window is closed — no fast is auto-created today
// (per the "Skip today" policy the trainer picked). Dedup is via
// `last_auto_fast_headsup_for` / `last_auto_fast_started_for` on
// client_feature_settings so each scheduled moment fires at most once.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendWebPush, recordExpiredSubscription } from "../_shared/web-push.ts";
import { computeScheduledFastStart, tzDateParts, makeDateInTz } from "../_shared/fast-schedule.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HEADSUP_LEAD_MIN = 5;   // heads-up fires 0..5 min BEFORE scheduled start
const AUTOSTART_GRACE_MIN = 30; // auto-start allowed up to 30 min after scheduled

function localDateForTz(iso: string, tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date(iso));
    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const d = parts.find((p) => p.type === "day")?.value;
    return `${y}-${m}-${d}`;
  } catch {
    return iso.slice(0, 10);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const results = { checked: 0, headsup: 0, started: 0, skipped: 0, failed: 0 };

  try {
    // ---- Backfill pass -------------------------------------------------
    // `next_scheduled_fast_at` is normally published by the app, which means a
    // client who never opens the app that day would never get a heads-up or an
    // auto-start. Recompute it server-side from the assigned protocol so the
    // schedule is authoritative regardless of app usage.
    await backfillScheduledStarts(supabase);

    // Widen the SQL filter so we only load clients whose scheduled moment is
    // in the +/- 40 min window around "now" — everyone else is irrelevant.
    const now = Date.now();
    const windowStart = new Date(now - (AUTOSTART_GRACE_MIN + 5) * 60_000).toISOString();
    const windowEnd = new Date(now + (HEADSUP_LEAD_MIN + 5) * 60_000).toISOString();

    const { data: rows, error } = await supabase
      .from("client_feature_settings")
      .select(
        "client_id, next_scheduled_fast_at, auto_fast_skip_date, last_auto_fast_headsup_for, last_auto_fast_started_for, active_fast_start_at, active_fast_target_hours, schedule_timezone, fasting_enabled, selected_protocol_id, enforce_scheduled_start"
      )
      .not("next_scheduled_fast_at", "is", null)
      .is("active_fast_start_at", null)
      .gte("next_scheduled_fast_at", windowStart)
      .lte("next_scheduled_fast_at", windowEnd);
    if (error) throw error;

    for (const r of rows ?? []) {
      results.checked++;
      if (r.fasting_enabled === false) { results.skipped++; continue; }
      const scheduledIso = r.next_scheduled_fast_at as string;
      const scheduledMs = new Date(scheduledIso).getTime();
      const deltaMin = (now - scheduledMs) / 60_000;
      const tz = r.schedule_timezone || "UTC";
      const scheduledLocalDate = localDateForTz(scheduledIso, tz);

      // Client tapped Cancel on the heads-up for today's scheduled fast.
      if (r.auto_fast_skip_date && String(r.auto_fast_skip_date).slice(0, 10) === scheduledLocalDate) {
        results.skipped++;
        continue;
      }

      // ---- Heads-up window: [-HEADSUP_LEAD_MIN, 0) ----
      const headsupAlreadyFired =
        r.last_auto_fast_headsup_for &&
        new Date(r.last_auto_fast_headsup_for as string).getTime() === scheduledMs;
      if (!headsupAlreadyFired && deltaMin >= -HEADSUP_LEAD_MIN && deltaMin < 0) {
        await sendPush(supabase, r.client_id, {
          title: "Your fast starts in 5 min",
          body: "Tap CANCEL if you're still eating. Otherwise we'll start it for you.",
          tag: `auto-fast-headsup-${scheduledIso}`,
          url: `/client/dashboard?auto_fast=headsup&scheduled=${encodeURIComponent(scheduledIso)}`,
          data: { kind: "auto_fast_headsup", scheduled_at: scheduledIso },
        }, results);
        await supabase.from("in_app_notifications").insert({
          user_id: r.client_id,
          type: "auto_fast_headsup",
          title: "Your fast starts in 5 min",
          body: "Tap CANCEL on your dashboard if you're still eating.",
          action_url: `/client/dashboard?auto_fast=headsup&scheduled=${encodeURIComponent(scheduledIso)}`,
          reference_id: scheduledIso,
        });
        await supabase
          .from("client_feature_settings")
          .update({ last_auto_fast_headsup_for: scheduledIso })
          .eq("client_id", r.client_id);
        results.headsup++;
        continue;
      }

      // ---- Auto-start window: [0, +AUTOSTART_GRACE_MIN] ----
      const startedAlready =
        r.last_auto_fast_started_for &&
        new Date(r.last_auto_fast_started_for as string).getTime() === scheduledMs;
      if (!startedAlready && deltaMin >= 0 && deltaMin <= AUTOSTART_GRACE_MIN) {
        // Resolve target hours (prefer stored active target; else look up protocol).
        let targetHours = Number(r.active_fast_target_hours) || 0;
        if (!targetHours && r.selected_protocol_id) {
          const { data: proto } = await supabase
            .from("fasting_protocols")
            .select("fast_target_hours")
            .eq("id", r.selected_protocol_id)
            .maybeSingle();
          targetHours = Number((proto as any)?.fast_target_hours) || 16;
        }
        if (!targetHours) targetHours = 16;

        // Start the fast at the SCHEDULED moment (not now) so tracking is accurate.
        const { error: upErr } = await supabase
          .from("client_feature_settings")
          .update({
            active_fast_start_at: scheduledIso,
            active_fast_target_hours: targetHours,
            last_fast_ended_at: null,
            eating_window_ends_at: null,
            last_auto_fast_started_for: scheduledIso,
            next_scheduled_fast_at: null,
          })
          .eq("client_id", r.client_id);
        if (upErr) { results.failed++; console.error("auto-start update error", upErr); continue; }

        // Activity event
        await supabase.from("activity_events").insert({
          client_id: r.client_id,
          event_type: "fast_started",
          title: "Fast auto-started",
          subtitle: `${targetHours}h target`,
          category: "fasting",
          icon: "play",
          metadata: { target_hours: targetHours, source: "auto_start", scheduled_at: scheduledIso },
          source: "auto_start",
          occurred_at: scheduledIso,
        });

        await sendPush(supabase, r.client_id, {
          title: "Your fast just started 🔥",
          body: `${targetHours}-hour target. Tap to open your timer.`,
          tag: `auto-fast-started-${scheduledIso}`,
          url: "/client/dashboard",
          data: { kind: "auto_fast_started", scheduled_at: scheduledIso, target_hours: targetHours },
        }, results);
        await supabase.from("in_app_notifications").insert({
          user_id: r.client_id,
          type: "auto_fast_started",
          title: "Your fast just started",
          body: `${targetHours}-hour target — timer is running.`,
          action_url: "/client/dashboard",
          reference_id: scheduledIso,
        });
        results.started++;
      }
    }

    return new Response(JSON.stringify({ ok: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("dispatch-auto-fast-starts error:", err);
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sendPush(
  supabase: any,
  userId: string,
  payload: { title: string; body: string; tag: string; url: string; data?: any },
  results: { failed: number },
) {
  // (see backfillScheduledStarts below)
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, user_agent")
    .eq("user_id", userId);
  for (const sub of subs ?? []) {
    const r = await sendWebPush(sub, payload);
    if (!r.ok) {
      results.failed++;
      if (r.expired) {
        await recordExpiredSubscription(supabase, {
          subscription_id: sub.id,
          user_id: userId,
          endpoint: sub.endpoint,
          user_agent: (sub as any).user_agent,
          status: r.status,
          removed_by: "dispatch-auto-fast-starts",
        });
      }
    }
  }
}
/**
 * Recompute and publish `next_scheduled_fast_at` for enforced clients whose
 * value is missing (app never opened today). Only writes a value inside the
 * dispatcher's active window so we never resurrect a stale schedule, and never
 * for a moment that already fired or that the client skipped today.
 */
async function backfillScheduledStarts(supabase: any): Promise<void> {
  const now = new Date();
  const { data: rows, error } = await supabase
    .from("client_feature_settings")
    .select(
      "client_id, schedule_timezone, day_start_hour, selected_protocol_id, selected_quick_plan_id, last_auto_fast_started_for, auto_fast_skip_date, protocol_start_date, assigned_protocol_duration_days",
    )
    .eq("fasting_enabled", true)
    .is("active_fast_start_at", null)
    .is("next_scheduled_fast_at", null);
  if (error) {
    console.error("backfillScheduledStarts query error", error);
    return;
  }

  for (const r of rows ?? []) {
    try {
      const tz = r.schedule_timezone || "UTC";
      const { y, mo, d } = tzDateParts(now, tz);
      const todayKey = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dow = new Date(`${todayKey}T12:00:00Z`).getUTCDay();

      // Respect the client's own calendar: a day marked as a rest day
      // (enabled = false) or "eat all day" must never auto-start a fast.
      const scheduledDay = await resolveScheduledDay(supabase, r.client_id, todayKey, dow);
      if (scheduledDay && (scheduledDay.enabled === false || scheduledDay.ratio === "eat_all_day")) {
        continue;
      }

      // Protocol window guard
      if (r.assigned_protocol_duration_days && r.protocol_start_date) {
        const endMs = new Date(r.protocol_start_date + "T00:00:00Z").getTime()
          + Number(r.assigned_protocol_duration_days) * 86_400_000;
        if (now.getTime() > endMs) continue;
      }

      let fastHours = 0;
      if (r.selected_protocol_id) {
        const { data: p } = await supabase
          .from("fasting_protocols")
          .select("fast_target_hours")
          .eq("id", r.selected_protocol_id)
          .maybeSingle();
        fastHours = Number(p?.fast_target_hours) || 0;
      } else if (r.selected_quick_plan_id) {
        const { data: q } = await supabase
          .from("quick_fasting_plans")
          .select("fast_hours")
          .eq("id", r.selected_quick_plan_id)
          .maybeSingle();
        fastHours = Number(q?.fast_hours) || 0;
      }
      // No protocol/quick plan assigned: fall back to the ratio the client
      // sees on their own calendar (e.g. "18:6" -> 18 fasting hours).
      if (!fastHours) fastHours = parseRatioHours(scheduledDay?.ratio) || 0;
      if (!fastHours) continue;

      // Prefer the exact start time the client sees in their calendar.
      const calendarStartHour = parseStartHour(scheduledDay?.window_start_time);
      const startAt = calendarStartHour !== null
        ? makeDateInTz(y, mo, d, Math.floor(calendarStartHour), Math.round((calendarStartHour % 1) * 60), tz)
        : computeScheduledFastStart({
            fastHours,
            dayStartHour: typeof r.day_start_hour === "number" ? r.day_start_hour : null,
            tz,
            now,
          });
      if (!startAt) continue;

      const deltaMin = (now.getTime() - startAt.getTime()) / 60_000;
      // Only publish once we're inside the heads-up / auto-start window.
      if (deltaMin < -HEADSUP_LEAD_MIN || deltaMin > AUTOSTART_GRACE_MIN) continue;

      const iso = startAt.toISOString();
      if (r.last_auto_fast_started_for
        && new Date(r.last_auto_fast_started_for).getTime() === startAt.getTime()) continue;

      if (r.auto_fast_skip_date && String(r.auto_fast_skip_date).slice(0, 10) === todayKey) continue;

      await supabase
        .from("client_feature_settings")
        .update({ next_scheduled_fast_at: iso, active_fast_target_hours: fastHours })
        .eq("client_id", r.client_id)
        .is("next_scheduled_fast_at", null);
    } catch (err) {
      console.error("backfillScheduledStarts row error", err);
    }
  }
}

type ScheduledDay = {
  day_of_week: number;
  ratio?: string | null;
  window_start_time?: string | null;
  enabled?: boolean | null;
};

/** "20:00:00" -> 20, "20:30" -> 20.5, anything else -> null */
/** "18:6" -> 18 fasting hours; null when the ratio is missing/not numeric. */
function parseRatioHours(v: string | null | undefined): number | null {
  if (!v) return null;
  const m = /^(\d{1,2})\s*:\s*(\d{1,2})$/.exec(String(v).trim());
  if (!m) return null;
  const h = Number(m[1]);
  return h > 0 && h <= 23 ? h : null;
}

function parseStartHour(v: string | null | undefined): number | null {
  if (!v) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(String(v));
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (Number.isNaN(h) || Number.isNaN(min) || h > 23) return null;
  return h + min / 60;
}

/**
 * The day the client actually sees for `dateKey`: a single-date override wins
 * over the recurring weekly template. Returns null when nothing is saved.
 */
async function resolveScheduledDay(
  supabase: any,
  clientId: string,
  dateKey: string,
  dow: number,
): Promise<ScheduledDay | null> {
  const { data: overrides } = await supabase
    .from("client_schedule_overrides")
    .select("schedule, start_date, end_date, active")
    .eq("client_id", clientId)
    .eq("active", true)
    .lte("start_date", dateKey)
    .gte("end_date", dateKey);
  for (const o of overrides ?? []) {
    const hit = (o.schedule as ScheduledDay[] | null)?.find((d) => d?.day_of_week === dow);
    if (hit) return hit;
  }

  const { data: weekly } = await supabase
    .from("client_weekly_schedule")
    .select("day_of_week, ratio, window_start_time, enabled")
    .eq("client_id", clientId)
    .eq("day_of_week", dow)
    .maybeSingle();
  return (weekly as ScheduledDay | null) ?? null;
}
