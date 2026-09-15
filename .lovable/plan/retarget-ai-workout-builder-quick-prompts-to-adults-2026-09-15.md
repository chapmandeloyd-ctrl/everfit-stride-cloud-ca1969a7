# Retarget AI Workout Builder Quick Prompts to Adults

## Goal
Remove all softball / basketball / 13–18 athlete framing from the AI Workout Builder so generated programs read as adult fitness content.

## What changes
Only one file: `src/components/workout/QuickPrompts.tsx` (the preset list shown in the AI Workout Builder dialog). No generator, route, or schema changes.

### Remove
- **Softball** group (all 8 presets: Hitting Power, Throwing Arm Care, Catcher Strength, etc.)
- **BB Conditioning** group (basketball court conditioning)
- Basketball wording inside other presets:
  - "for a guard" in Upper Push/Pull
  - "for basketball players" in Full Mobility Flow
  - "Court Conditioning Circuit" preset (basketball drills, suicides)
  - "In-Season" group (youth sports season framing)

### Replace with adult-focused groups (same visual style, 2-column preset cards)
- **Strength** — keep, remove sport references
- **Fat Loss & Conditioning** — adult metabolic/HIIT workouts
- **Muscle Building** — hypertrophy splits for adults
- **Power & Plyos** — keep, adult phrasing
- **At-Home** — keep
- **Mobility & Recovery** — keep, remove "basketball players" wording
- **Body Part** — keep all (Core, Glutes, Chest, Back, etc. — already adult)
- **Circuit & Tabata** — keep, replace the basketball Court Conditioning preset with a neutral conditioning circuit
- **Equipment-Only groups** (Dumbbell, Cable, Barbell, etc.) — keep unchanged, already neutral

## Verification
Check the live preview: open the AI Workout Builder and confirm the category chips show only adult-focused groups, with no Softball / Basketball / In-Season presets.
