## Goal
Lock in the new terminology and ship a new dark **Program** page that combines the assigned Protocol + Keto Type + Daily Meal Timeline. Keep the old gold complete-plan code as a backup but make it unreachable.

## Terminology lock
- **Protocol** = fasting half (e.g. Classic 16:8)
- **Keto Type** = nutrition half (SKD, HPKD…)
- **Program** = Protocol + Keto Type combined

## Step 1 — Rename on `/client/programs`
File: `src/pages/client/ClientPrograms.tsx`
- "All Programs" → **"All Protocols"**
- "Your Current Program" → **"Your Current Protocol"**
(Route stays `/client/programs` — internal only, no nav links break.)

## Step 2 — Hide gold complete-plan (keep file as backup)
- Keep `src/pages/client/ClientFastingPlanDetailPreview.tsx` untouched (backup).
- In `src/App.tsx`, remove the `/client/complete-plan` route so it 404s / falls through.
- Repoint every `navigate("/client/complete-plan")` and click handler to the **new** `/client/program` route:
  - `src/components/dashboard/AssignedPlanCard.tsx`
  - `src/pages/client/ClientDashboard.tsx`
  - `src/pages/client/ClientProfile.tsx`
  - `src/pages/client/ClientProtocolDetail.tsx`
  - `src/pages/client/ClientKetoTypeDetail.tsx` (post-assign navigations)
  - `src/pages/client/ClientFastingPlanDetailPreview.tsx` (the inner navs — leave or repoint; either way unreachable)
- Result: gold UI still exists in the repo for reference but no UI surface links to it.

## Step 3 — New dark Program page at `/client/program`
New file: `src/pages/client/ClientProgram.tsx` + route in `App.tsx`.

Layout (mobile-first, `max-w-md mx-auto`, dark theme, electric red primary):

```text
[← back]  Your Program
─────────────────────────────
Why it works  (1 short paragraph, dynamic by protocol+keto)
─────────────────────────────
PROTOCOL
<InteractiveProtocolCard status="current" />     (assigned, dark flip card)
─────────────────────────────
KETO TYPE
<InteractiveKetoTypeCard dimmed=false />          (assigned, dark flip card)
─────────────────────────────
DAILY MEAL TIMELINE
- Daily totals strip (Cal / Fat / Carbs / Protein) — red+teal chips
- Vertical dotted rail w/ 4 blocks: Fast → Break-Fast → Lunch → Dinner
- Each meal: time, label, description, macro chips
─────────────────────────────
[ Browse Protocols ]   [ Browse Keto Types ]
```

### Data sources
- **Assigned Protocol** → `client_feature_settings.selected_protocol_id` → `fasting_protocols` row (same query as `ClientPrograms`).
- **Assigned Keto Type** → existing keto-type query used by `ClientKetoTypes` (DB-driven `color`, `how_it_works`, `built_for`, `carb_limit_grams`).
- **Eating-window times** → derived from `fasting_protocols.description.daily_structure` (same `pickWindowTimes` logic as gold page — extract into `src/lib/programWindow.ts`).
- **Meal Timeline content** → port `MEAL_PLANS` + `CHANGE_HIGHLIGHTS` constants from the gold file into a new shared module `src/lib/programMealPlans.ts`. Pure visual data, no behavior change. (The gold page's data is already hardcoded; we keep parity now and can wire it to AI/DB later.)
- **Time-shifting** → reuse `parseTime/toMinutes/fromMinutes/formatTime` helpers (extract to `src/lib/timeWindow.ts`).

### Theming
- All colors via semantic tokens: `bg-background`, `text-foreground`, `border-border`, `text-primary` (electric red), `text-muted-foreground`.
- Macro dots: keep meaning but use tokens — `text-primary` (Cal), `text-amber-300` (Fat), `text-sky-400` (Carbs), `text-violet-400` (Protein).
- No gold (`#GOLD`, ivory). No inline HSL strings.

### What it does NOT include (parity with gold page minus noise)
- No keto-type comparison switcher (the assigned type is the only one shown — full library lives on `/client/keto-types`).
- No "What changed" delta strip (only relevant when comparing types).
- No bookmark / wheel picker / synergy primer carousel.

## Step 4 — Verify in browser
- Navigate to `/client/program` as a paired client; confirm:
  - Both flip cards render and flip
  - Timeline renders 4 blocks with macro chips
  - "Browse Protocols" → `/client/programs`, "Browse Keto Types" → `/client/keto-types`
  - `/client/complete-plan` no longer renders (route gone, links repointed)

## Files touched
- Edit: `src/pages/client/ClientPrograms.tsx` (headers)
- Edit: `src/App.tsx` (drop complete-plan route, add /client/program route)
- Edit: 5 files repointing navigate() targets
- New: `src/pages/client/ClientProgram.tsx`
- New: `src/lib/programMealPlans.ts` (ported constants)
- New: `src/lib/timeWindow.ts` (shared time helpers)

## Open question
The Daily Meal Timeline in the gold page is **hardcoded mock data**, not from the DB. I'll port it as-is so the new page renders the same content. If you want it driven by real meals (from the meal-planning system or AI), that's a follow-up. OK to proceed with ported mock data for now?
