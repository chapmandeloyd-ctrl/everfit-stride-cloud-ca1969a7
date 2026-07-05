// Pre-fast reminder dispatcher (runs every 5 minutes via pg_cron).
//
// For each client with fasting_enabled = true, no active fast, and a scheduled
// fast today, fires up to three transactional emails as the start time nears:
//   - night_before   (~8pm client-local the day before)
//   - t_minus_60     (60 min before start)
//   - t_minus_15     (15 min before start)
//
// Dedup uses public.notification_log with kind = 'pre_fast_email' and
// reference_id = '<startIso>:<slot>'. Respects pre_fast_email_pref:
// 'off' skips all, 'final_only' fires only t_minus_15, 'all' fires all three.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const TOLERANCE_MIN = 6 // cron runs every 5 min; give ~1 min slack

type Slot = 'night_before' | 't_minus_60' | 't_minus_15'

function getTzOffsetMinutes(tz: string, at: Date): number {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
    const parts = dtf.formatToParts(at)
    const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value ?? '0', 10)
    const asUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
    return (asUTC - at.getTime()) / 60_000
  } catch { return 0 }
}

function makeDateInTz(y: number, mo: number, d: number, h: number, min: number, tz: string): Date {
  const iso = `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}T${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}:00`
  const asIfUTC = new Date(iso + 'Z')
  const offset = getTzOffsetMinutes(tz, asIfUTC)
  return new Date(asIfUTC.getTime() - offset * 60_000)
}

function tzDateParts(now: Date, tz: string): { y: number; mo: number; d: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  return {
    y: parseInt(parts.find(p => p.type === 'year')?.value ?? '2000', 10),
    mo: parseInt(parts.find(p => p.type === 'month')?.value ?? '1', 10),
    d: parseInt(parts.find(p => p.type === 'day')?.value ?? '1', 10),
  }
}

function formatStartLabel(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz, weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(d)
}

/**
 * Compute today's scheduled fast-start time for a client, matching the client's
 * uniform eating-window logic: eatEnd = day_start_hour + (24 - fastHours).
 * Returns null when we can't determine it (no protocol, missing data).
 */
function computeScheduledFastStart(opts: {
  fastHours: number
  dayStartHour: number | null
  tz: string
  now: Date
}): Date | null {
  const eh = Math.min(23, Math.max(1, 24 - opts.fastHours))
  let endHour: number
  if (typeof opts.dayStartHour === 'number' && !Number.isNaN(opts.dayStartHour)) {
    endHour = ((Math.floor(opts.dayStartHour) + eh) % 24 + 24) % 24
  } else {
    endHour = 20
  }
  const { y, mo, d } = tzDateParts(opts.now, opts.tz)
  return makeDateInTz(y, mo, d, endHour, 0, opts.tz)
}

function slotForMinutesUntil(minsUntil: number, nowTz: Date, startTz: Date, tz: string): Slot | null {
  // t_minus_15: fire when 9 <= minsUntil <= 21
  if (minsUntil >= 15 - TOLERANCE_MIN && minsUntil <= 15 + TOLERANCE_MIN) return 't_minus_15'
  // t_minus_60: fire when 54 <= minsUntil <= 66
  if (minsUntil >= 60 - TOLERANCE_MIN && minsUntil <= 60 + TOLERANCE_MIN) return 't_minus_60'
  // night_before: fire at 8pm client-local the day BEFORE start.
  // i.e. now is between 19:54 and 20:06 tz-local AND start is tomorrow tz-local.
  const nowParts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(nowTz)
  const hh = parseInt(nowParts.find(p => p.type === 'hour')?.value ?? '0', 10)
  const mm = parseInt(nowParts.find(p => p.type === 'minute')?.value ?? '0', 10)
  const nowMin = hh * 60 + mm
  if (nowMin >= 20 * 60 - TOLERANCE_MIN && nowMin <= 20 * 60 + TOLERANCE_MIN) {
    // Determine if start is tomorrow tz-local
    const nd = tzDateParts(nowTz, tz)
    const sd = tzDateParts(startTz, tz)
    const nowKey = nd.y * 10000 + nd.mo * 100 + nd.d
    const startKey = sd.y * 10000 + sd.mo * 100 + sd.d
    if (startKey === nowKey + 1) return 'night_before'
    // Handle month/year rollover with a millisecond check
    if (startTz.getTime() - nowTz.getTime() >= 20 * 3600_000 && startTz.getTime() - nowTz.getTime() <= 28 * 3600_000) {
      return 'night_before'
    }
  }
  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
  const now = new Date()
  let considered = 0, sent = 0, skipped = 0, failed = 0

  try {
    // Pull all fasting-enabled clients that aren't currently in an active fast.
    const { data: settings, error } = await supabase
      .from('client_feature_settings')
      .select('client_id, fasting_enabled, active_fast_start_at, selected_protocol_id, selected_quick_plan_id, day_start_hour, schedule_timezone, protocol_start_date, assigned_protocol_duration_days, autostart_skipped_on, pre_fast_email_pref')
      .eq('fasting_enabled', true)
      .is('active_fast_start_at', null)
    if (error) throw error

    for (const s of settings ?? []) {
      considered++
      const pref = (s as any).pre_fast_email_pref || 'all'
      if (pref === 'off') { skipped++; continue }

      const tz = (s as any).schedule_timezone || 'UTC'
      const dayStartHour = (s as any).day_start_hour

      // Resolve fast target hours from protocol OR quick plan
      let fastHours: number | null = null
      let protocolLabel: string | null = null
      if ((s as any).selected_protocol_id) {
        const { data: p } = await supabase
          .from('fasting_protocols')
          .select('name, fast_target_hours')
          .eq('id', (s as any).selected_protocol_id).maybeSingle()
        fastHours = (p as any)?.fast_target_hours ?? null
        protocolLabel = (p as any)?.name ?? null
      } else if ((s as any).selected_quick_plan_id) {
        const { data: q } = await supabase
          .from('quick_fasting_plans')
          .select('name, fast_hours')
          .eq('id', (s as any).selected_quick_plan_id).maybeSingle()
        fastHours = (q as any)?.fast_hours ?? null
        protocolLabel = (q as any)?.name ?? null
      }
      if (!fastHours || fastHours <= 0 || fastHours >= 24) { skipped++; continue }

      // Skip if protocol has ended
      const dur = (s as any).assigned_protocol_duration_days
      const start = (s as any).protocol_start_date
      if (dur && start) {
        const endMs = new Date(start + 'T00:00:00Z').getTime() + dur * 86_400_000
        if (now.getTime() > endMs) { skipped++; continue }
      }

      const startAt = computeScheduledFastStart({ fastHours, dayStartHour, tz, now })
      if (!startAt) { skipped++; continue }
      const minsUntil = (startAt.getTime() - now.getTime()) / 60_000

      // Only consider positive countdowns (skip fasts that have already started)
      if (minsUntil < -TOLERANCE_MIN) { skipped++; continue }

      const slot = slotForMinutesUntil(minsUntil, now, startAt, tz)
      if (!slot) { skipped++; continue }

      // Honour 'final_only'
      if (pref === 'final_only' && slot !== 't_minus_15') { skipped++; continue }

      // Skip if client cancelled auto-start for today (still uses same date key)
      const todayKey = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(now).replace(/\//g, '-')
      if ((s as any).autostart_skipped_on === todayKey && slot !== 'night_before') {
        skipped++; continue
      }

      const refId = `${startAt.toISOString()}:${slot}`

      // Dedup: skip if already sent
      const { data: existing } = await supabase
        .from('notification_log').select('id')
        .eq('user_id', s.client_id).eq('kind', 'pre_fast_email')
        .eq('reference_id', refId).eq('status', 'sent').maybeSingle()
      if (existing) { skipped++; continue }

      // Resolve recipient
      const { data: profile } = await supabase
        .from('profiles').select('email, full_name')
        .eq('id', s.client_id).maybeSingle()
      const recipient = (profile as any)?.email
      if (!recipient) { skipped++; continue }
      const firstName = ((profile as any)?.full_name || '').trim().split(/\s+/)[0] || undefined

      const startLabel = formatStartLabel(startAt, tz)

      // Send via existing transactional-email pipeline
      const invokeRes = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({
          templateName: 'pre-fast-reminder',
          recipientEmail: recipient,
          idempotencyKey: refId,
          templateData: {
            name: firstName,
            slot,
            startLabel,
            fastHours,
            protocolLabel,
          },
        }),
      })

      const okResp = invokeRes.ok
      if (okResp) sent++; else failed++
      try { await invokeRes.text() } catch {}

      await supabase.from('notification_log').insert({
        user_id: s.client_id,
        kind: 'pre_fast_email',
        reference_id: refId,
        title: `Pre-fast reminder (${slot})`,
        body: `${protocolLabel ?? 'Fast'} starts ${startLabel}`,
        status: okResp ? 'sent' : 'failed',
        subscription_count: 1,
        delivered_count: okResp ? 1 : 0,
      })
    }

    return new Response(
      JSON.stringify({ ok: true, considered, sent, skipped, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('dispatch-pre-fast-emails error:', err)
    return new Response(
      JSON.stringify({ error: err?.message || String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})