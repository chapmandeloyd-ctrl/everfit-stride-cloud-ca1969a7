# Fast Auto-Start + Countdown + Email Reminders

Turn the lion card's static `1/3 DAY` chip into a live experience: show a countdown to the next scheduled fast, auto-start the fast at T-0 with a 5-minute grace window the user can cancel, and email the client 3 times before the start.

Zero changes to the legacy `FastingProtocolCard` timer logic (protected by memory). We build on `useClientComputedPlan`, `useScheduledFastGate`, and `useStartFast` — the plan already knows which upcoming days are fast days and their `fastWindow` / start hour.

---

## 1. Compute the "next fast start" time (client-side)

New hook `src/hooks/useNextScheduledFastStart.ts`:
- Read `useClientComputedPlan()` → walk forward from `dayIndex` to find the next day with `adFast` or a fast window whose start-time hasn't passed yet today.
- Combine with `protocolStartDate` + the day's parsed start hour to get a real `Date`.
- Return `{ startsAt: Date, dayLabel, protocolLabel }`.
- Skip entirely if a fast is already `active` (`active_fast_start_at` set) or protocol is complete.

## 2. Countdown row above the CTA button

Edit `src/pages/client/ClientDashboard.tsx` around line 1683 (the CTA block).
- Above `Open Live Schedule to Start`, render a new row when `startsAt` exists:
  ```
  ┌────────────────────────────────────────────┐
  │ ⏱  NEXT FAST STARTS IN  04:12:33           │
  │    Sun · 8:00 PM · 16h target              │
  └────────────────────────────────────────────┘
  ```
- Tick every second via `useEffect` + `setInterval` (only while row is mounted).
- At T-0 the row swaps to a red pulsing "Starting in 4:59… tap to cancel" state during the 5-min grace.
- After grace elapses, row hides (fast is now active — the existing `ActiveFastingTimer` takes over).

## 3. Auto-start with 5-min grace

New hook `src/hooks/useAutoStartScheduledFast.ts`:
- Watches `startsAt` from hook #1 and current time.
- State machine: `idle → armed (at T-0) → grace (5 min countdown, user can Cancel) → started` OR `cancelled`.
- On grace expiry: call the existing `useStartFast()` mutation (no new business-logic path — reuses same insert into `fasting_log` + `client_feature_settings.active_fast_start_at`).
- Cancel button writes today's date into a new `client_feature_settings.autostart_skipped_on` column so we don't re-arm the same day.
- Respects existing `useScheduledFastGate` early/late window logic.

Small toast on auto-start: "Your 16:8 fast started."

## 4. Emails: night-before + 1hr + 15min

**Database** — 1 new column, no new tables:
```sql
ALTER TABLE public.client_feature_settings
  ADD COLUMN IF NOT EXISTS autostart_skipped_on date,
  ADD COLUMN IF NOT EXISTS pre_fast_email_pref text
    NOT NULL DEFAULT 'all' CHECK (pre_fast_email_pref IN ('all','final_only','off'));
```
Reuse existing `notification_log` (`kind = 'pre_fast_email'`, `reference_id = '<startIso>:<slot>'`) for dedup, same pattern as `dispatch-fasting-milestones`.

**New edge function** `supabase/functions/dispatch-pre-fast-emails/index.ts`:
- Runs every 5 min via existing pg_cron pattern.
- For each client with `fasting_enabled = true` and no active fast:
  - Compute next scheduled fast `startsAt` server-side (mirror hook #1 logic using `computed_plan_days` if we have it, otherwise reuse `protocolPlan` server helper — extract shared calc into `_shared/computeNextFastStart.ts`).
  - Fire slots when in these windows (5-min tolerance):
    - `night_before` — 8pm client-local the day before
    - `t_minus_60` — 60 min before start
    - `t_minus_15` — 15 min before start
  - Skip if `pre_fast_email_pref = 'off'`, or `= 'final_only'` and slot ≠ `t_minus_15`.
  - Enqueue via existing app-email queue (`send-transactional-email`) so it flows through Lovable Emails infra.

**New app-email template** `supabase/functions/_shared/transactional-email-templates/pre-fast-reminder.tsx`:
- One template, three subject variants driven by `templateData.slot`:
  - night_before → "Your fast starts tomorrow at 8:00 PM"
  - t_minus_60 → "Your fast starts in 1 hour"
  - t_minus_15 → "Your fast starts in 15 minutes"
- Body: countdown, protocol name, target hours, "It'll auto-start — open the app to cancel."
- Registered in `_shared/transactional-email-templates/registry.ts`.

**Cron** — pg_cron job every 5 min hitting `dispatch-pre-fast-emails` (added via `supabase--insert`, not migration, since it embeds URL + anon key).

## 5. User control

Add a small "Email reminders" toggle in the Live Schedule dialog footer (writes `pre_fast_email_pref`). Values: All 3 / Final only / Off. Purely additive — no changes to existing dialog layout above the footer.

---

## Files touched

**New**
- `src/hooks/useNextScheduledFastStart.ts`
- `src/hooks/useAutoStartScheduledFast.ts`
- `src/components/client/NextFastCountdownRow.tsx`
- `supabase/functions/dispatch-pre-fast-emails/index.ts`
- `supabase/functions/_shared/computeNextFastStart.ts`
- `supabase/functions/_shared/transactional-email-templates/pre-fast-reminder.tsx`
- 1 schema migration (2 columns on `client_feature_settings`)
- 1 `supabase--insert` for the pg_cron job

**Edited**
- `src/pages/client/ClientDashboard.tsx` — insert countdown row above line 1684, mount auto-start hook
- `src/components/client/LiveScheduleDialog.tsx` — add email-preference toggle
- `_shared/transactional-email-templates/registry.ts` — register new template

**Untouched (per memory constraint)**
- `FastingProtocolCard`, `ActiveFastingTimer`, `useStartFast` internals

---

## Verification (live browser)
Per your rule I'll log in as Dee after building, watch the countdown row appear, fast-forward system state to confirm the 5-min grace/cancel flow, and check `notification_log` after triggering `dispatch-pre-fast-emails` manually to confirm the three slot rows insert with correct `reference_id`s.

## Open credit note
The email dispatcher + template + testing is the biggest chunk (~40% of the work). If you'd rather ship the **countdown + auto-start UI first** and add emails in a second pass, say the word and I'll do just steps 1-3 now.