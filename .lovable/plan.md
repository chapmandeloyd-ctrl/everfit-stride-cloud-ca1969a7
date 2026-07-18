# Custom Weekly Fasting Windows + Vacation Overrides

Give each client an editable 7-day fasting schedule (ratio + eating-window start per day) with optional date-range overrides that auto-revert.

## Database

**Table 1 — `client_weekly_schedule`** (base weekly schedule, one row per client per day)
- client_id, day_of_week (0-6), ratio (`16:8` | `18:6` | `20:4` | `eat_all_day`), window_start_time, window_end_time (derived), enabled

**Table 2 — `client_schedule_overrides`** (vacation / date-range overrides)
- client_id, label (e.g. "Vacation"), start_date, end_date, schedule JSONB (same 7-day shape), created_by, active
- Auto-revert = simply reading only overrides where `today BETWEEN start_date AND end_date`

Both tables: standard RLS (trainer of client OR the client itself can read/write), GRANT to authenticated + service_role, updated_at trigger.

Backfill: seed `client_weekly_schedule` for existing clients from their current protocol default (12–8 PM 16:8 style).

## Resolver

New helper `src/lib/resolveFastingWindow.ts`:
```
resolveWindowForDate(clientId, date) →
  1. look for active override covering date → use its schedule[dayOfWeek]
  2. else use client_weekly_schedule[dayOfWeek]
  3. return { ratio, windowStart, windowEnd, fastStart, fastEnd }
```

Every consumer switches to this single resolver:
- `TodaysWindowCard`, `NextFastCountdownRow`, `ActiveFastingTimer`
- `LiveScheduleDialog` (renders 30 days by calling resolver per date)
- `src/lib/protocolPlan.ts`
- edge functions: `dispatch-auto-fast-starts`, `dispatch-plan-start-reminders`
- 30-min start gate hook `useScheduledFastGate`

## UI — Client Protocol tab

New `WeeklyScheduleEditor` component on the client detail page:

```
Weekly Schedule
─────────────────────────────────────────────
Mon  [16:8 ▾]  Starts [12:00 PM ▾]  → 8:00 PM
Tue  [16:8 ▾]  Starts [12:00 PM ▾]  → 8:00 PM
Wed  [18:6 ▾]  Starts [ 2:00 PM ▾]  → 8:00 PM
Thu  [16:8 ▾]  Starts [12:00 PM ▾]  → 8:00 PM
Fri  [20:4 ▾]  Starts [ 4:00 PM ▾]  → 8:00 PM
Sat  [Eat all day]
Sun  [16:8 ▾]  Starts [12:00 PM ▾]  → 8:00 PM
                                    [Save]
```

Below it: **Date-range Overrides**
```
+ Add override
  Label: [Vacation]  From: [Jul 20]  To: [Jul 27]
  [same 7-day editor]
  [Save]  [Delete]
```
Active overrides badge in list. Auto-reverts because reads are date-filtered.

## Verification

Impersonate Dee Jay, set Wed to 18:6 @ 2 PM, add a Jul 20–27 override with different times, then screenshot:
- Today card reflects today's resolved window
- Live Schedule dialog shows override days highlighted
- Auto-start cron logs pick correct next start

## Notes / Technical

- Ratio → fast length: 16:8=16h, 18:6=18h, 20:4=20h, eat_all_day=no fast that day
- `window_end_time = window_start_time + eating_hours` (computed, stored for query speed)
- Overrides never delete base schedule; toggling override off instantly restores base
- Migration will include GRANTs and RLS as required