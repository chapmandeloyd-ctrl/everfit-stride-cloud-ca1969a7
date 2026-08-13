---
name: Juice log reminders
description: Daily juice-fast log reminder pipeline — cron dispatcher, push with email fallback, per-session time setting
type: feature
---
- `dispatch-juice-log-reminders` edge function runs every 5 min (cron job `dispatch-juice-log-reminders-5min`).
- Per-session settings live on `juice_fast_sessions`: `log_reminder_enabled` (default true), `log_reminder_time` (default `19:00`, client-local via `client_health_reminders.timezone`).
- Skips when today's `juice_fast_daily_logs` row exists; deduped in `notification_log` with kind `juice_log`, reference `${session_id}:${localDate}`.
- Delivery order: Web Push to all devices → email template `juice-log-reminder` only if no push delivered → always an in-app notification (`type: juice_log_reminder`).
- Client toggle + time picker live in `ActiveJuiceFastCard`.
