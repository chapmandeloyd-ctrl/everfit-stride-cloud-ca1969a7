---
name: Juice Fast
description: Multi-day juice fast feature — two modes (juice only / juice plus light snacks), day-based ring timer, daily juice log
type: feature
---
Juice fasts are **day-based**, not window-based. They ride extended-fast style rails, never the eating-window rails.

- Two modes on `juice_fast_sessions.mode`: `juice_only` (strict, no solid food) and `juice_plus_light` (juice + small snacks, no full meals).
- Tables: `juice_fast_sessions` (mode, planned_days, started_at, ends_at, status, ended_early, includes_refeed) and `juice_fast_daily_logs` (juice_count, water_oz, snacked, snack_note, energy_rating).
- Hero ring shows **Day N of X** with day markers around the ring, not fasting stages.
- Client can self-start 1–3 days (`SELF_SERVE_MAX_DAYS`); 4+ days requires trainer assignment.
- Refeed day auto-flagged for 3+ day fasts.
- Named juices + calories are tracked in **Trainerize**, not in this app — the daily log only captures counts.
- While a juice fast is active, `JuiceFastDashboardSlot` replaces the regular fasting card so there is only one hero ring.