## Goal
Turn the protocol card's "Daily Schedule" into the **complete daily playbook** — fasting windows, days of week, per-day keto type, and timed nutrition/supplement instructions — all editable by the trainer.

## New trainer controls per protocol assignment

1. **Active days of the week** (Mon–Sun checkboxes). Default: all 7. Off-days show "Rest — eat to maintenance" instead of the fasting window.
2. **Keto type per day** with two modes:
   - **Simple mode (default):** one keto type applies to all active days (one tap).
   - **Advanced mode:** different keto type per weekday (e.g. Mon TKD, Tue SKD, Wed HPKD, Sat CKD).
3. **Daily timeline items** — ordered list of timed instructions:
   - Stop eating · 8:00 PM
   - Eating window opens · 12:00 PM — *Break fast with HPKD-friendly meal (high protein ~30g)*
   - Pre-workout · 30 min before — *Light carbs only if TKD day*
   - Post-workout · within 30 min — *Creatine 5g + protein meal*
   - Mid-window · 3:00 PM — *Largest meal, focus on fats*
   - Window closes · 8:00 PM
   - Each item: title, time (or relative trigger), keto-type-aware note, optional supplement reference.

## New supplement library (trainer-managed)

Tiny library so timeline items can reference real supplement entries instead of free text:
- name (Creatine, Electrolytes, MCT Oil, Magnesium…)
- default dose (e.g. "5 g")
- default timing hint (e.g. "post-workout")
- notes (when to skip, what to take with)

Trainer creates once, reuses across all protocols.

## Client experience

On the protocol card, **Daily Schedule** becomes the hero section:
- Top row: keto type chip for *today* (HPKD) + tap to see what HPKD means → opens explainer sheet (macros, ratios, sample foods, who it's for).
- Active-days strip: M T W T F S S with dots showing which days are scheduled.
- Vertical timeline with times + keto-aware coaching lines + supplement chips.
- Rest days show a calm "Rest day — eat to maintenance" card instead.

## Technical plan (for your reference)

**New tables**
- `supplements` — id, trainer_id, name, default_dose, default_timing, notes, is_active
- `protocol_daily_schedules` — id, protocol_id (or assignment_id), client_id (nullable for templates), keto_mode ('simple'|'advanced'), default_keto_type, active_days (int[] 0–6)
- `protocol_schedule_keto_overrides` — schedule_id, weekday (0–6), keto_type — only used in advanced mode
- `protocol_schedule_items` — schedule_id, order_index, label, time_of_day (nullable), relative_trigger (nullable: 'pre_workout'|'post_workout'|'wakeup'|'sleep'), offset_minutes, note, supplement_id (nullable), keto_type_filter (nullable — show only on those keto days)

All public-schema tables get GRANTs + RLS (trainer writes own rows; clients read their assigned schedule).

**UI changes** (read-only summary)
- `src/components/FastingProtocolCard.tsx` — Daily Schedule section becomes the new timeline component. Existing fasting timer logic untouched per memory constraint.
- New `src/components/protocol/ProtocolScheduleEditor.tsx` (trainer side, in trainer protocol editor).
- New `src/components/protocol/KetoTypeChip.tsx` + `KetoTypeExplainerSheet.tsx` for the client side.
- New trainer page section: `src/pages/trainer/SupplementsLibrary.tsx`.
- Hooks: `useProtocolSchedule(protocolId, clientId)`, `useSupplements()`.

**Migration delivery:** I'll output the SQL for you to apply yourself per your preferences.

## Build order

1. DB schema + grants/RLS (you apply).
2. Supplement library (trainer page + CRUD).
3. Protocol schedule editor (trainer side) — days, keto mode, timeline items.
4. Client-side rendering inside the existing protocol card (replaces current "Daily Schedule").
5. Keto type explainer sheet.
6. Verify live on Classic 16:8 with a Mon=TKD / Tue=SKD test setup.

## Out of scope (for now)
- Pushing supplement reminders as notifications (can come later via Habit Loop).
- Auto-syncing schedule changes to active fasts already in progress.
- AI-generated schedule defaults (can layer on later).
