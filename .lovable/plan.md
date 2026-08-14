# Replacing Trainerize with APEXBEAST-IF — Gap Audit + Migration Roadmap

## Where you already stand

You are much closer than it feels. What Trainerize (and FitMetrics on top of it) sells, you already own most of:

| Trainerize capability | APEXBEAST-IF today |
|---|---|
| Client management / roster | Clients, Client Command Center, impersonation, RBAC |
| Messaging | Realtime chat, voice notes, GIFs |
| Nutrition + macros | Full engine, meal intelligence, grocery lists, AI meal analysis |
| Workout library + builder | Exercises, Workouts, Templates, Collections, AI Workout Builder |
| Programs / calendars | Programs, Studio Programs, Live Schedule, Fasting Calendar |
| Habits / check-ins | Tasks & Habits, recurring check-ins, AI-drafted feedback |
| Progress tracking | Body metrics (19+), photos, charts, snapshots |
| Notifications | Push + email dispatch stack (already broader than theirs) |
| Booking / scheduling | Scheduling, Client Appointments/Booking |
| AI coaching | Coach copilot, client assistant, fasting AI |

**Genuine gaps:** weekly compliance grid, workout *tracking* polish for non-fasting clients, forms/assessments, challenges + leaderboard, payments/billing, and client-facing "everything in one app" navigation.

## Roadmap — 4 stages, each shippable on its own

### Stage 1 — Trainer control layer (highest value, lowest risk)
- **Compliance Tracker grid**: clients as rows, last 7/30 days as columns, red/yellow/green from existing adherence + workout + nutrition + habit data. Click a cell to open that client's day.
- **At-risk queue**: auto-surface clients with 2+ red days, no logins, missed check-ins.
- **AI task generation**: copilot reads recent client messages/logs and drafts trainer to-dos into the existing Task Library.

Outcome: you can coach entirely from your app while Trainerize still holds programs.

### Stage 2 — Training becomes first-class
- Client workout player parity: supersets, rest timers, RPE, history-aware weight prefill, "last time you did X".
- Program builder: multi-week program assignment with auto-progression, drag-drop calendar, template reuse.
- Trainer review feed of completed sessions with inline comments.

Outcome: workouts no longer need to live in Trainerize.

### Stage 3 — Onboarding, forms, engagement
- Form/assessment builder (intake, PAR-Q, weekly check-in) with client responses stored and AI-summarized — this is where FitMetrics beats Trainerize, and it's straightforward for us.
- Challenges + leaderboard built on existing badges/adherence scoring.
- Group/team assignment so tasks, programs and challenges can be pushed to segments.

### Stage 4 — Business layer + cutover
- Payments/subscriptions and plan tiers.
- Trainerize historical import (activities, health stats, workouts already partially wired) so migrated clients keep their history.
- Client-by-client migration: move 2–3 pilot clients first, run parallel for 30 days, then move the rest and cancel Trainerize.

## Native / Apple Health — deliberately out of the critical path
Stay PWA. Health data keeps coming through manual + screenshot + Trainerize import paths. A native companion for HealthKit/Watch is a Stage 5 *optional* project, never a blocker. That is what burned money last time.

## Technical notes
- Compliance grid is a read-only aggregation: one paginated query per range over existing adherence/session/log tables, cached client-side; no new writes, no schema risk.
- New tables needed later (forms, form_responses, challenges, challenge_entries, program_assignments) will be delivered as SQL migrations with GRANTs + RLS for you to review before applying.
- Everything reuses existing edge-function dispatch patterns for reminders; no new infrastructure.

## Suggested first build
Stage 1, Compliance Tracker grid + at-risk queue. It is self-contained, uses data you already store, and removes the single biggest reason to pay FitMetrics $150/month.
