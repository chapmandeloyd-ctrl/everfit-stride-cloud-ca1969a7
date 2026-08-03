# Apex360-IF: The Custom Fasting Calendar (client-owned, mobile-first)

The headline feature: **you build your own fasting calendar — day, week, month — and Apex AI helps when you get stuck or builds it for you.** It ties directly to the Smart Weight Tracker so every schedule change instantly re-projects your pace.

Everything the trainer console can do today moves to the client, redesigned for a phone.

---

## 1. The Fasting Calendar (client side)

One home for the whole schedule, three zooms:

```text
[ Month ]  [ Week ]  [ Day ]
 ─────────────────────────────
 Month : dots per day (fasting / eating-only / paused / travel)
 Week  : 7 rows, tap a row to edit that day inline
 Day   : full timeline — fast start, break-fast, last meal, macros
```

- **Tap any day → edit that day only.** Ratio (16:8 / 18:6 / 20:4 / eat all day / rest), fast start time, break-fast auto-calculates.
- **Long-press / "Apply to…"** → apply that day's setup to the rest of the week, all weekdays, all weekends, or the whole month.
- **Drag the window** on the Day view to shift start/end — no typing.
- Everything is mobile-first: full-screen sheets, big tap targets, thumb-reachable Save bar, no desktop tables.

## 2. Pause, travel, reschedule

A single **"Life happens"** button on the calendar:

- **Pause plan** — pick dates, plan freezes, calendar greys out, no missed-fast penalties, Smart Pace target date auto-shifts.
- **Travel / vacation mode** — lighter ratio for the range, then auto-revert.
- **Shift plan** — move the whole plan forward N days (sick week, work trip).
- **Rest day** — one-tap "no fast today", schedule stays intact.

These reuse the existing date-range override engine, wrapped in plain language.

## 3. Ties into Smart Weight Tracker

The calendar and the pace tracker are one system:

- Change your schedule → **instant re-projection**: "This still lands you at 185 lbs by Nov 12" or "This pushes your date back 6 days — want to keep it or tighten another day?"
- Pause → target date extends automatically, no debt penalty for paused days.
- Off pace 2 days → the calendar itself suggests the fix ("add one 18:6 day this week to catch up").
- Weigh-in flows straight back into the calendar's daily debt/credit.

## 4. Apex AI, right in the calendar

Two modes, both always available:

**Assist** — a floating AI button on the calendar. Ask anything mid-build:
- "Is 20:4 too much on training days?"
- "I work nights, when should I fast?"
- "Can I move Sunday to eat-all-day?"
Answers are contextual — the AI sees your current calendar, goal, pace, and training days.

**Build it for me** — "Don't want to plan? Let Apex AI do it." A short question flow (wake/sleep, work pattern, training days, social meals, experience, goal), then it fills the entire month. Every single day it created is still editable — nothing is locked.

## 5. Workout-schedule aware

When a client is on a workout routine, the calendar reads their training days and warns/suggests around them:
- Break-fast lands post-workout on training days.
- Heavy training day + 20:4 → gentle flag with a one-tap fix.

## 6. Trainer side

Trainer keeps full visibility and can still edit, but the client owns the plan:
- Client edits freely; trainer gets a "plan changed" notification.
- Coach-set days show a "your coach suggested this" chip with **Restore coach's plan** — nothing is ever lost.
- Existing Protocol Calculator stays available to the trainer for edge cases.

---

## Technical section

**Reuse (no rewrite):**
- `client_weekly_schedule` + `client_schedule_overrides` tables and `useClientWeeklySchedule` — already power the trainer editor.
- `resolveFastingWindow.ts`, `useClientComputedPlan.ts`, Live Schedule month view, Smart Pace engine (`smartPaceEngine.ts`, `useSmartPace.ts`).
- `FastingProtocolCard` legacy timer stays untouched.

**New client surfaces (`src/pages/client/` + `src/components/client/calendar/`):**
- `FastingCalendarPage.tsx` — Month/Week/Day segmented control, mobile-first shell.
- `DayEditorSheet.tsx` — per-day ratio + fast start, "Apply to…" bulk action.
- `WeekEditorList.tsx` — mobile rewrite of `WeeklyScheduleEditor` (stacked cards, not a table).
- `LifeHappensSheet.tsx` — pause / travel / shift / rest, writes date-range overrides.
- `PaceImpactBar.tsx` — live "what this does to your target date" strip, driven by Smart Pace.

**New data:**
- `client_schedule_day_overrides(client_id, date, ratio, window_start_time, enabled, source)` — single-date edits, so a one-off change doesn't need a full range override. RLS: client own rows, trainer via existing client link, service_role all; GRANT SELECT/INSERT/UPDATE/DELETE to authenticated, ALL to service_role.
- `plan_pauses(client_id, start_date, end_date, kind, created_at)` — feeds pace re-projection and suppresses adherence penalties.

**AI:**
- Extend `generate-ai-fasting-plan` with a `mode: "full_calendar"` that returns a per-day array for N days instead of a single protocol.
- New `calendar-assist` edge function (`google/gemini-3-flash-preview`) — receives the current calendar + goal + pace state, answers questions and can return a suggested patch the user accepts with one tap.

**Mobile pass:** every calendar surface built at 390px first, `100dvh` sheets, hidden scrollbars (existing `.onboarding-scroll-scope` pattern), sticky bottom action bar, no horizontal scroll anywhere.

---

## Build order

1. Client Fasting Calendar shell — Month / Week / Day, read-only from existing data
2. Day editor sheet + single-date override table (real editing)
3. Week editor (mobile rewrite) + "Apply to…" bulk actions
4. Life Happens: pause / travel / shift / rest + `plan_pauses`
5. Smart Pace impact bar — live target-date re-projection on every edit
6. Apex AI Assist button (contextual Q&A on the calendar)
7. "Build it for me" full-calendar AI generation
8. Workout-day awareness + trainer notification / restore-coach-plan
