# Client Plan Builder — mirror the admin experience (mobile-first)

## 1. Why old times still show on days

Two separate causes, both real bugs:

1. **Hardcoded default week.** `useClientWeeklySchedule` and `calendarUtils.defaultWeek()` both fall back to `16:8, fast 8:00 PM, breaks 12:00 PM` for any day with no saved row. So a client with no program at all still sees "8:00 PM → 12:00 PM" on every square. Those are phantom times, not a schedule.
2. **Assignment window is ignored by the calendar.** The admin builder stores Plan Type, Assignment Duration, Start Date, and Run Mode ("One-time run" = days outside the window are greyed). The client calendar never reads that window, so days before the start date and after the run ends still render full fasting times.

Fix: the calendar resolves a day to one of `scheduled` / `rest` / `out-of-plan` / `unset`. `out-of-plan` and `unset` render an em-dash with muted styling, never a fabricated time.

## 2. Give the client the same builder, mobile-friendly

New page `/client/plan-builder`, reachable from the calendar's "Build my plan" banner and the lion card's manual option. It is a stacked, thumb-sized version of the admin Protocol Calculator with the same fields and the same math (reuses `computePlan` from `src/lib/protocolPlan.ts` — no logic fork):

- **Fuel Style** — full APEX list (B / P / L / R / X) with the colored dot and P/C/F line.
- **Fasting Protocol** — same protocol list.
- **Weight, Goal, Activity, Start Date** — same inputs; custom-deficit slider included with the same warnings.
- **Plan Type / Assignment Duration / Run Mode** — same three, with the same helper copy.
- **Results** — TDEE, Daily Target, macro grams, identical to admin.
- **Weekly Fasting Schedule** — per-day ratio + fast start time with auto-calculated break time, plus a "Save Weekly Schedule" action.

Mobile treatment: single column, full-width 48px controls, sticky bottom action bar holding Save / Preview / Clear, sections collapsed into accordions so the page isn't a 3000px scroll, and native time/date pickers.

## 3. Step order

1. Add plan-window resolution (`start_date`, `duration_days`, `run_mode`) to `resolveFastingWindow` and remove the fabricated default times from the client calendar and week strip.
2. Extract the admin calculator's shared pieces (fuel styles, goal/activity tables, computation, save mutation) into a shared module so both sides stay in sync.
3. Build `ClientPlanBuilder` page consuming that shared module with the mobile layout.
4. Build the mobile weekly-schedule editor block inside it.
5. Wire entry points: calendar banner, lion card "I'll build my own", week strip empty state.
6. Leave the admin panel untouched.

## 4. Verification

Log in as the client in the browser, build a plan end to end, save it, then set a fast start a couple of minutes out and let it auto-start so the lion timer is visibly running. Screenshots of each state at the end.

## Technical notes

- No change to `FastingProtocolCard` timer logic or `useStartFast` — the builder only writes `client_weekly_schedule`, `client_schedule_overrides`, and the keto/protocol assignment rows the admin panel already writes.
- Shared module keeps one source of truth for TDEE/macros so admin and client can never drift.
