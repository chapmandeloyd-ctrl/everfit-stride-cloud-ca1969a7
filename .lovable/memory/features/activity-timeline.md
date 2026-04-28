---
name: Activity Timeline
description: Append-only client event log + timeline UI mirrored on client tab and trainer command center
type: feature
---
**Table:** `activity_events` (client_id, occurred_at, event_type, category, title, subtitle, icon, metadata, source, actor_id, edited).

**Helpers:**
- DB: `emit_activity_event(...)` and `backfill_activity_events(client_id)`
- Client: `emitActivityEvent({...})` in `src/lib/activityEvents.ts` — fire-and-forget, never blocks feature flow.

**UI:**
- `src/components/timeline/ActivityTimeline.tsx` — shared component, `trainerMode` prop reveals Backfill button.
- Client route: `/client/timeline` (page `ClientTimeline.tsx`) added to `ClientBottomNav` between Today and Explore.
- Trainer view: rendered inside `CoachCommandCenterTab` with backfill enabled.

**Categories:** fasting, eating, workout, metrics, badges, trainer, habits, general.

**Wired emitters so far:** `startFastMutation`, `endFastMutation` (also emits eating_window_opened), `endFastSkipFuelMutation`. Other features (workouts, weigh-ins, badges, meals, trainer overrides) use the backfill function until live emitters are added in follow-ups.

**RLS:** clients SELECT/INSERT own; trainers full CRUD on assigned clients via `is_trainer_of_client`. Edits auto-mark `edited=true` via trigger.
