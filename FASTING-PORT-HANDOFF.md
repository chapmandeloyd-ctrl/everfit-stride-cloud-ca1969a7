# APEXBEAST-IF → Fasting System Port Handoff

Paste this whole document into the target project's chat (Apex Elite Athlete / apexbeast-daf),
along with an `@mention` of the source project: **`@everfit-stride-cloud`**
so the AI can read its source files.

---

## Goal

Port the complete intermittent-fasting system from the @mentioned APEXBEAST-IF project into this
app **without breaking** anything that already exists here (Athlete-OS, admin console, cardio,
auth, clients, youth athlete features).

Do it in the phases below, verifying live in the browser after each phase.

---

## Important Architecture Note

The source project uses **Supabase Edge Functions** for server-side dispatch jobs. The target
app (Apex Elite Athlete-OS) runs on **TanStack Start**, which does not use Supabase Edge Functions.

Therefore:
- **Phase 1 (database schema)** ports over nearly verbatim.
- **Phase 2 (edge functions)** must be adapted into **TanStack Start server routes/API routes**
  inside this app, using the same business logic but this project's existing push/email infra.
- **Phase 3 (cron jobs)** must be wired into this project's scheduler/cron mechanism
  (e.g., Vercel Cron, Inngest, or whatever periodic job runner this app already uses),
  calling the new server routes instead of Supabase function URLs.

Keep the logic identical; only the deployment target changes.

---

## Phase 1 — Database

Read the source project's `supabase/migrations/` and recreate the fasting schema here.
For every new `public` table: `CREATE TABLE` → `GRANT` → `ENABLE ROW LEVEL SECURITY` → `CREATE POLICY`,
in that order, in the same migration.

Core fasting tables to recreate (copy exact DDL, RLS and grants from source):

- `fasting_log` — active/completed fast sessions
- `fasting_protocols` — protocol library (16:8, 18:6, 20:4, OMAD 23:1, 5:2, 4:3, Eat-Stop-Eat, Weekend Warrior)
- `quick_fasting_plans`
- `protocol_daily_schedules`, `protocol_schedule_items`, `protocol_schedule_keto_overrides`
- `protocol_assignment_history`
- `client_weekly_schedule`, `client_schedule_overrides` (per-client weekly plan + vacation/manual overrides)
- `client_keto_assignments`, `keto_types`, `keto_categories` (user-facing label is **Fuel Style**, not Keto)
- `fasting_synergy_selection`, `plan_synergy_content`
- `juice_fast_sessions`, `juice_fast_daily_logs`, `juice_fast_reminder_log`
- `early_session_ends`
- `plan_completions`
- `ai_plan_proposals`
- `engine_scores`, `engine_score_history` (0–100 adherence score)
- `push_subscriptions`, `push_subscription_removals`, `notification_preferences`
- `user_metabolic_profile`, `client_macro_targets`
- `trainer_fasting_cards`, `fasting_webhook_log`, `keto_phase_notifications_log`

Relevant columns on `client_feature_settings` that drive fasting must also be added:
`auto_fast_skip_date`, `day_start_hour`, `protocol_calc_inputs` (jsonb), fasting/juice/extended toggles,
pre-fast email toggle. Copy the exact column set from the source project's table definition.

---

## Phase 2 — Server-side dispatch logic

Copy the logic from these `supabase/functions/` files in the source project, but implement them
as TanStack Start server routes / API routes in this app:

| Function | Purpose |
|---|---|
| `dispatch-auto-fast-starts` | Server-authoritative automatic fast start |
| `dispatch-pre-fast-emails` | Email 5 min before a fast starts |
| `dispatch-fasting-milestones` | 24h-interval milestone pushes |
| `dispatch-fast-hydration-reminders` | Hydration nudges during a fast |
| `dispatch-plan-start-reminders` | Missed-plan-start alerts |
| `dispatch-protocol-reminders` | Hourly protocol reminders |
| `dispatch-juice-log-reminders` | Daily juice log nudges |
| `dispatch-juice-hydration-reminders` | Juice hydration nudges |
| `dispatch-juice-stage-advances` | Juice fast stage progression |
| `generate-ai-fasting-plan` | AI plan builder (Lovable AI, `google/gemini-2.5-flash`) |
| `coach-fast-intervention` | Early-end coaching line |
| `notify-trainer-fast-cancelled` | Trainer alert on cancellation |
| `elevenlabs-tts` | Narration audio for the demo walkthroughs |
| `keto-phase-check` | Fuel-style adaptation stage checks |
| `send-push` / push helpers in `_shared` | Web push delivery |

---

## Phase 3 — Cron / scheduled jobs

Wire these schedules into this project's existing cron/job runner, each hitting the corresponding
TanStack Start server route created in Phase 2. If this project uses `pg_cron`/`pg_net`, use this
project's own server-route URL and auth headers.

| Job | Schedule |
|---|---|
| `dispatch-auto-fast-starts` | `* * * * *` |
| `dispatch-fast-hydration-reminders` | `*/5 * * * *` |
| `dispatch-fasting-milestones` | `*/5 * * * *` |
| `dispatch-pre-fast-emails` | `*/5 * * * *` |
| `dispatch-juice-log-reminders` | `*/5 * * * *` |
| `dispatch-juice-hydration-reminders` | `*/5 * * * *` |
| `dispatch-juice-stage-advances` | `*/10 * * * *` |
| `dispatch-plan-start-reminders` | `5 * * * *` |
| `dispatch-protocol-reminders` | `0 * * * *` |

Enable `pg_cron` and `pg_net` first.

---

## Phase 4 — Frontend files

Copy from the source project (keep filenames identical so imports resolve):

**Pages** (`src/pages/client/`)
`ClientDashboard`, `ClientDashboardMinimal`, `ClientFastComplete`, `ClientFastingCalendar`,
`ClientStagesTimeline`, `ClientProgram`, `ClientKetoTypes`, `ClientKetoTypeDetail`,
`ClientPlanBuilder`, `ClientChooseProtocol`, `ClientCustomPlans`, `ClientQuickPlans`,
`ClientQuickPlanDetail`, `ClientProtocolDetail`, `ClientPlanHistory`, `ClientOnboarding`,
`AIPlanBuilderDemo`, `ExtendedFastDemo`, `JuiceFastDemo`

**Components**
- `src/components/FastingTimer.tsx` (the ring — arc segments and stage emojis stay hidden until reached)
- All of `src/components/client/` including `IdleFastingHero`, `ActiveFastingTimer`,
  `ScheduleCountdownRow`, `NextFastCountdownRow`, `PrepRunwayCard`, `LiveScheduleDialog`,
  `LiveScheduleHost`, `AlternateFastOptions`, `TodaysWindowCard`, `EditTodayScheduleSheet`,
  `CalendarStrip`, `CalendarStripTourSheet`, `StartFastGate`, `PreFastEmailToggle`,
  `EnablePushBanner`, `IOSInstallGuideDialog`, and the `extended/`, `juice/`, `calendar/` folders
- `src/components/keto/` (Fuel Style cards + detail views)

**Hooks** (`src/hooks/`)
`useStartFast`, `useActiveFastElapsed`, `useTodayFastState`, `useScheduledFastGate`,
`useClientWeeklySchedule`, `useJuiceFast`, `usePrepChecklist`, `useProtocolLibrary`,
`useCaptionNarration`, `useAuth`

**Lib** (`src/lib/`)
`protocolPlan.ts`, `prepRunway.ts`, `resolveFastingWindow.ts`, `fastingStages.ts`,
`fastingStagesEnriched.ts`, `fastingMilestones.ts`, `fastingCategoryConfig.ts`,
`protocolCalcShared.ts`, `protocolCardContent.ts`, `protocolDetailContent.ts`,
`extendedFast.ts`, `juiceFast.ts`, `juiceStages.ts`, `pushNotifications.ts`

---

## Phase 5 — Routes

Add these routes. If any collide with existing routes in this app, namespace the fasting ones
under `/client/fasting/*` and update the internal links — **do not** rename or remove existing routes.

```
/client/dashboard          /client/calendar             /client/program
/client/stages             /client/plan-builder         /client/choose-protocol
/client/custom-plans       /client/quick-plans          /client/quick-plan/:id
/client/protocol/:id       /client/keto-types           /client/keto-types/:id
/client/plan-history       /client/ai-plan-demo         /client/plan-builder-demo
/client/extended-fast-demo /client/juice-fast-demo      /client/fast-complete
```

---

## Phase 6 — Secrets to add in this project

- `ELEVENLABS_API_KEY` — demo narration
- `RESEND_API_KEY` — pre-fast + plan emails
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — web push (generate a fresh pair; do not reuse)
- `TRAINERIZE_API_TOKEN` / `TRAINERIZE_GROUP_ID` — only if Trainerize sync is wanted
- `LOVABLE_API_KEY` — already present; used by the AI plan builder
- `ADMIN_PIN` — if the admin PIN login is ported

---

## Product rules that must survive the port

- **Automatic fast starts.** Fasts start server-side, not by a button. A 30-minute gate applies to
  scheduled starts. Cancelling writes `auto_fast_skip_date` to the DB (await it) so the countdown
  does not reappear after sign-out.
- **Never route to `/client/fast-complete` when a fast was ended early.**
- **The fasting ring** shows an empty black track; coloured arc segments and stage emojis appear
  only once that progress point is actually reached. Do not pre-render the full rainbow.
- **Wall-clock persistence** everywhere — `Date.now()` / `now() - started_at`, never interval counters.
- **User-facing wording is "Fuel Style", never "Keto".** DB tables keep the `keto_*` names.
- **Prep Runway**: AI-generated plans start the *next* day, with a phase-based prep checklist.
- **Extended fast** = 3 phases (Prepare / Fast / Refeed); safety acknowledgment nudges rather than
  hard-disabling the start button.
- **Design**: pure black background, electric red `#CC1A1A` primary, Space Grotesk headings, Inter body.
  Use semantic tokens in `index.css` — no hardcoded colour utilities.
- **Fasting is disabled for the Athletic (youth 13–18) engine.** Keep that guard intact in this app.

---

## Verification checklist

Sign in as a client and confirm live in the browser:

1. Onboarding produces a plan and shows a Prep Runway with a live countdown.
2. Dashboard hero swaps correctly between "Fast starts in", "Fasting", and "Eating window · time left".
3. Cancelling today's fast persists across sign-out/sign-in.
4. Ring starts empty and fills as time passes; emojis appear only at their stage.
5. Extended fast and juice fast sheets open, start, and log.
6. Push permission prompt works on iOS/iPadOS after Add to Home Screen.
7. No "Keto" wording visible anywhere in client-facing UI.
