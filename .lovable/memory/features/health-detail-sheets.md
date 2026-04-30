---
name: Health Detail Sheets
description: Apple-Health-style depth views for Steps/Sleep/Weight tiles. Reusable MetricDetailSheet + dedicated sleep_sessions table for bedtime/wake bars.
type: feature
---
Tapping Steps / Sleep / Body Weight on My Progress opens a full-screen sheet
with range tabs (2W/1M/3M/6M/1Y; Weight uses 3M/6M/1Y/2Y/3Y), AreaChart,
summary stats, About blurb, and reverse-chronological daily history.

- Reusable component: `src/components/health/MetricDetailSheet.tsx` with
  `summaryMode: "sum" | "minmax"` (Weight uses minmax → Avg/Min/Max).
- Steps keeps its dedicated `StepsDetailSheet.tsx` (legacy, identical behaviour).
- Daily series fetched via `useMetricHistory` → edge function `read-health-stats`
  in `metric_history` mode (works for any metric_definition name).
- **Sleep bedtime/wake chart** comes from a separate `sleep_sessions` table
  (started_at, ended_at, duration_minutes). Native HealthKit sync writes 14d
  of intervals on each refresh (`src/lib/native-health.ts` →
  `data.sleepSessions[]`). Rendered by `SleepTimesChart.tsx` with empty state
  when no intervals exist (e.g. PWA-only users).
