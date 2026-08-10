# Full Plan Demo — Crash Course Narration

Turn the demo into a teaching session: before the AI picks anything, the voice explains **every option** in that dropdown, then says which one it will use "for this example."

## New chapter flow (each waits for the voice to finish, then "Click Next to continue")

### 1. Intro
"APEXBEAST AI is about to build your entire plan. Before each choice, I'll explain every option so you know exactly what you're picking."

### 2. Fuel Style — 5 sub-chapters, one per option
Each shows the option card highlighted in the dropdown while she reads it:
- **APEX-B · Apex Balance** — P50 / C30 / F20. Foundational everyday fuel; even split, easiest to sustain long term.
- **APEX-P · Apex Performance** — P45 / C35 / F20. Highest carbs for training volume, protects muscle while you train hard.
- **APEX-L · Apex Lean** — P40 / C30 / F30. Strategic carb cycling: more carbs on training days, fewer on rest days.
- **APEX-R · Apex Recomp** — P40 / C30 / F30 with training-day loading. For building muscle and dropping fat at once.
- **APEX-X · Apex Low-Carb Extreme** — P20 / C10 / F70. Deep low-carb reset for stubborn fat and appetite control.
Closing line: "For this example we'll use **Apex Lean**." → dropdown animates to Apex Lean.

### 3. Fasting Protocol — 5 sub-chapters
- **16:8 Daily (16h)** — fast 16, eat 8, every day. The proven starting point.
- **16:8 Weekdays (16h)** — same 16:8 Monday–Friday, relaxed weekends. Best for social schedules.
- **18:6 Daily (18h)** — deeper into ketosis daily; step up once 16:8 feels easy.
- **20:4 Warrior (20h)** — one large meal plus a small one; strong autophagy and appetite control.
- **OMAD (23h)** — one meal a day. Maximum fat-burning window; advanced only.
Closing: "For this example we'll use **16:8 Weekdays**." → dropdown animates.

### 4. Your Numbers — explain each field
Weight, goal weight, activity level, and target pace — what each one changes and why the plan recalculates when you edit them.

### 5. Calories & Macros
How the calorie target is derived, then what protein / carbs / fat each do, with the gram targets read aloud.

### 6. Weekly Schedule — explain the day types
Standard fasting day, harder day (18:6), OMAD day, and **Eat all day** (a full refeed day — no fast, used to keep metabolism and adherence up). Then the week fills in row by row.

### 7. Saved & Armed
Plan lands on the calendar, timer arms itself, single days can still be tweaked from the day strip.

### 8. The Timer
No start button — the fast begins on its own at the scheduled time.

### 9. Watching the Fast
The stage progression: blood sugar drop → glycogen burn → ketosis → fat burning.

## Technical notes
- `CHAPTERS` in `AutoBuilderDemo.tsx` becomes a nested list where a chapter can hold multiple narrated beats; each beat has its own caption + optional `highlightIndex` into the open dropdown.
- The dropdown stays open and scrolls/highlights the option currently being described.
- Progression stays narration-gated (existing `useCaptionNarration` completion signal); no timeline scrubbing.
- Chapter pill bar shows the parent chapters only; a "3 of 5" counter shows sub-beats.
- Runtime grows to roughly 4–5 minutes of narration.
