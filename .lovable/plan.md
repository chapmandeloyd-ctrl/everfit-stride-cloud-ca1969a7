## Goal

Replace the current `TodaysWindowCard` with a single, denser card that combines the 7-day cycle strip (from the Program page) with today's window, macros, and full-schedule CTA. Same file, same mount point, same data source — no logic changes anywhere else.

## Final card structure (top → bottom)

```text
┌─────────────────────────────────────────────┐
│ STAGE 1 · ADAPTATION (i)      [7-DAY CYCLE] │  ← header row (stage + cycle chip)
│                                             │
│ ● 16:8 Weekdays · Standard Ketogenic Diet   │  ← protocol + keto subtitle
│                                             │
│ Mon  Tue  Wed  Thu  Fri  Sat  Sun           │  ← 7 tiles, today highlighted w/ keto accent ring
│ 16:8 16:8 16:8 16:8 16:8 16:8 16:8          │
│  ●    ●    ●    ●    ●    ●    ●            │  ← dot color = state (green eat / red fast / blue refeed / yellow low-cal)
│                                             │
│ ● Eat  ● Fast  ● Refeed  ● Low-cal          │  ← legend, only dots present this week
│                                             │
│ ┌──── BREAK FAST ────┐ ┌── LAST MEAL BY ──┐│  ← today window (hidden on fast day)
│ │ 🍴 12:00 PM        │ │ ⏰ 8:00 PM       ││
│ └────────────────────┘ └──────────────────┘│
│                                             │
│ [1624 CAL] [203g PROTEIN] [20g C] [81g F]  │  ← macro row (hidden on fast day)
│                                             │
│ FAST DAY variant:                           │
│ 🔥 24h fast · water + electrolytes          │
│                                             │
│ REFEED banner (if today):                   │
│ ℹ Prioritize clean carbs & lean protein     │
│                                             │
│         VIEW FULL SCHEDULE  →               │  ← single footer CTA (routes to /client/program)
└─────────────────────────────────────────────┘
```

## What's removed

- The separate "Tomorrow" row (folded into the schedule — visible via View Full Schedule).
- The old "See your full program →" text link (replaced by the outlined "View Full Schedule" button).
- No changes to the lion card, Start Fast gate, Smart Weight Tracker, or Program page.

## Implementation

Single file edit: `src/components/client/TodaysWindowCard.tsx`.

1. Keep the same export name (`TodaysWindowCard`) and props signature (none) — no consumer changes.
2. Reuse the existing `useClientComputedPlan()` hook — it already returns `plan.days`, `dayIndex`, `stage`, `ketoAccent`, `protocolName`, `ketoName`.
3. Add a **stage header row**: `STAGE {n} · {label.toUpperCase()}` with the existing info `(i)` popover (short description from `stage.description`), and a pill on the right showing `{plan.days.length}-DAY CYCLE`.
4. Add a **subtitle line**: `● {protocolName} · {ketoName}` (bullet uses `ketoAccent`).
5. Add a **7-tile day strip**:
   - Render `plan.days.map(...)`.
   - Each tile: weekday label (Mon/Tue/... derived from `dayIndex` offset so today lands on the correct real weekday), a small state dot, and a compact label (`16:8`, `24h`, `Refeed`, `Low-cal`).
   - Today's tile gets a 1px ring in `ketoAccent` + subtle glow.
   - Dot color: green = eat, red = `adFast`, blue = `isRefeed`, yellow = low-cal (detected from `fastWindow.toLowerCase().startsWith("low-cal")`).
6. **Legend**: render only the dot categories that appear in this week.
7. Keep the existing **Break fast / Last meal by tiles** and **macro tiles** exactly as they render today (same `WindowTile` / `MacroTile` sub-components), only shown when `!isFastDay`.
8. Keep the **fast-day** and **refeed** callouts.
9. Replace the footer text link with an **outlined "View Full Schedule →" button** (border in `ketoAccent`, ghost fill) that navigates to `/client/program`.

## Technical notes

- No new dependencies. Uses existing `Card`, `Badge`, `lucide-react` icons, `useNavigate`.
- Weekday labels: compute `startOfWeek` from today minus `dayIndex` days if `plan.days.length === 7`; otherwise show `Day 1 … Day N`.
- No changes to `useClientComputedPlan`, `protocolPlan.ts`, dashboard mount, or Program page.
- Fast-day tiles still render in the strip (so the week is always visible); the Break fast / Last meal / macro rows swap to the fast-day callout instead.

## Verification

After edit, browser-verify on `/client/dashboard`:
1. Card shows stage header, 7-tile strip with today highlighted, window + macros, View Full Schedule button.
2. Tapping View Full Schedule routes to `/client/program`.
3. On a fast day, macro row is replaced by the fast callout but the 7-tile strip still renders.
