# Apex360 AI Plan Builder

Goal: onboarding gathers rich lifestyle data → Apex360 AI proposes a full personalized fasting + fuel plan → client reviews, accepts or adjusts → plan drives the existing Live Schedule calendar. Client can regenerate any time from the dashboard.

## Guiding principles

- **AI is the coach.** No coach picks the protocol anymore; the AI does.
- **Nothing is one-size-fits-all.** The plan explains *why* each choice was made from the client's own answers.
- **Client stays in control.** The AI output is a *proposal* — client must Accept or Adjust before it becomes their active plan.
- **Keep what works.** The Live Schedule month calendar (last screenshot) stays as the "what's happening" surface. This builder feeds it.

---

## 1. Smarter onboarding — what the AI needs to ask

Split into 3 short groups. Each answer feeds the AI prompt.

**A. About you (already have most)**
- Sex, age, height, current weight, goal weight
- Activity level, training days/week, training time of day

**B. Your day (new — this is what makes it smart)**
- Wake time / sleep time (so we never suggest a 6 AM break-fast for a 10 AM riser)
- Typical first-hunger time
- Work schedule (9-5, shift work, flexible, night shift)
- When you're usually with family / social meals (dinner is sacred? lunch at desk?)
- Weekends different from weekdays? (Y/N)

**C. Fasting & fuel history (new)**
- Have you fasted before? (never / tried / regular)
- Longest fast completed
- Any medical flags (diabetes, pregnancy, ED history) → gate to safe protocols
- Fuel preference: Balance / Performance / Lean / Recomp / Extreme *(existing Fuel Styles)*
- Foods you avoid (vegetarian, dairy-free, etc.)
- Caffeine (yes/no, when)

**D. Motivation (1 line)**
- "Why now?" free text → AI uses it in the "Why this plan works" explanation

---

## 2. AI proposal screen (new)

After the last question:

> **"Apex360 AI is building your plan…"** (2–3 sec loading with reasoning bullets streaming in)

Then a beautiful proposal card:

```text
YOUR APEX360 AI PLAN
────────────────────
Protocol:      16:8 Daily
Fuel Style:    Performance
Eating Window: 1:00 PM – 9:00 PM
Duration:      21-day starter block
Weekly:        7 days on, aligned to your wake time
```

Below it, **three collapsible sections**:

- **"Why this plan works for you"** — 4–6 bullets citing the client's own answers ("You wake at 10 AM, so we start your eating window at 1 PM instead of noon…", "You train Tue/Thu evenings, so your biggest meal lands post-workout…")
- **Eating schedule breakdown** — mini timeline (Fast → Break-fast meal → Snack → Last meal → Fast), inspired by the Nora Minno screenshot
- **What to expect week 1** — hunger curve, energy, tips

Bottom actions:
- `Accept Plan` (primary)
- `Adjust` → opens the existing WeeklyScheduleEditor pre-filled with AI values, client tweaks window times / days
- `Regenerate` → "not quite right?" re-runs AI with a short "what should change?" text box

---

## 3. Dashboard integration

- **Live Schedule calendar stays exactly as-is** (last screenshot). It reads from the same `client_feature_settings` the AI writes to.
- Add a small **"Coached by Apex360 AI"** chip under the protocol name.
- New button in dashboard menu: **"Regenerate my plan"** → opens a light sheet: "What's changed?" (lost/gained weight, new schedule, plateaued, want more challenge) → re-runs AI → shows proposal again.
- Keep the existing "adjust weekly schedule" and pre-fast email toggles.

---

## 4. Coach (trainer) side

- Coach panel becomes **read-only view of the AI's plan** + optional override toggle ("Override AI") that unlocks the manual calculator we already have. Nothing is lost — the manual path is still there for edge cases.

---

## Technical section

**New edge function:** `supabase/functions/generate-ai-fasting-plan/`
- Model: `google/gemini-3-flash-preview` (matches existing AI Coach memory)
- Input: full onboarding payload + last weight + Fuel Styles catalog + safe protocols list
- Uses AI SDK `generateText` with `Output.object` schema for the plan (protocol_id, fuel_style, window_start, window_end, duration_days, weekly_pattern, reasoning[], expectations[], schedule_breakdown[])
- Prompt enforces: never suggest window before wake time, medical flags gate to 14:10/16:8 only, honors fuel preference.

**New tables (small):**
- `ai_plan_proposals(id, client_id, payload jsonb, status text, created_at)` — every proposal stored so we can show history + "regenerated 3× this month" analytics. RLS: client sees own, trainer sees their clients, service_role all. GRANT SELECT/INSERT/UPDATE to authenticated, ALL to service_role.

**Onboarding changes** (`src/pages/client/ClientOnboarding.tsx` + new steps in `src/components/onboarding/premium/steps/`):
- Add `DailyRhythmStep` (wake/sleep/work), `FastingHistoryStep`, `MotivationStep` before the existing metabolic/synergy steps.
- Replace current "coach picks later" ending with new `AIPlanProposalStep` that calls the edge function.

**New components:**
- `AIPlanProposalCard.tsx` — the proposal card with the 3 collapsible sections + Accept/Adjust/Regenerate.
- `EatingScheduleBreakdown.tsx` — mini timeline inspired by uploaded reference.
- `RegeneratePlanSheet.tsx` — dashboard sheet.

**Existing to reuse untouched:**
- `LiveScheduleDialog.tsx` (the calendar you love — keep as-is)
- `useClientComputedPlan.ts` (already reads from `client_feature_settings`, so AI writes there and everything renders)
- `WeeklyScheduleEditor.tsx` for the Adjust path
- Fuel Styles list, Fasting Protocols catalog
- Fasting timer, milestones, all fasting logic

**Not touched:** `FastingProtocolCard` legacy timer (per fasting-timer-preservation memory), the Live Schedule calendar UI, existing pre-fast email system.

---

## Build order (I'd ship in this order)

1. New onboarding steps (Daily Rhythm, Fasting History, Motivation) — no AI yet, just collect
2. Edge function + `ai_plan_proposals` table + Gemini prompt
3. `AIPlanProposalCard` + Accept path (writes to `client_feature_settings`)
4. Adjust path (opens WeeklyScheduleEditor pre-filled)
5. `EatingScheduleBreakdown` timeline component
6. Dashboard "Regenerate my plan" sheet
7. Coach panel → read-only view + Override toggle

Ready to start with step 1 when you say go.