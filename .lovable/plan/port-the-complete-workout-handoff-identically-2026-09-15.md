# Port the Complete Workout Handoff Identically

## Scope
- Replace the current workout detail and player presentation with the complete handoff flow, not a visual approximation.
- Preserve the existing APEXBEAST routes, authentication, database records, workout generation, scheduling, editing, assignments, completion history, badges, and wall-clock persistence.
- Keep the established black, electric-red, and teal APEXBEAST theme and existing fonts; use the handoff's exact screen structure, sizing, spacing, typography treatment, controls, transitions, and states.
- Do not change fasting, nutrition, login, or unrelated pages.

## Workout Detail
- Port the handoff block presentation line by line: branded header, workout cover and metadata, start/schedule actions, duration and exercise totals, exact block titles and badges, Coach Reads Aloud panels, exercise media rows, work/rest or sets/reps text, two coach-cue rows, dividers, and between-block rest notices.
- Adapt only field names from the handoff to the existing workout plans, sections, exercises, videos, thumbnails, narration, and cue fields.
- Keep cover and exercise media fully visible in fixed frames without cropping.

## Complete Player Flow
- Port the handoff READY overview with workout information, fitted exercise list, audio status, Your Coach Today card, voice preview, and full coach selector.
- Port the spoken introduction sequence, coach-speaking states, animated lime line and audio-reactive multicolor waveform, countdown, glowing GO gate, and Skip Intro behavior.
- Port the active workout screens: exercise video, timer ring, round and timing statistics, calories and progress, Up Next and rest cards, pause/volume/lock controls, Next, Skip Exercise, Skip Block, End Workout, and completion states.
- Wire block narration, exercise names, start/mid/switch cues, work/rest instructions, countdowns, halfway prompts, water breaks, and outro speech to the saved workout data and existing voice service.

## Preserve Existing Behavior
- Retain the current workout session creation, progress saves, resume behavior, completion/partial completion records, exercise logs, calories, skipped-event tracking, badge awards, scheduling, and edit/delete controls.
- Retain wall-clock timer recovery across backgrounding and page reloads.
- Add only the handoff helpers required for the exact experience, adapted to the current app's data and service boundaries.

## Verification and Release
- Check the app compiles cleanly and inspect current preview error logs.
- Sign into the live preview and test the full flow with real saved workout data: detail page, READY screen, coach selection and preview, spoken intro, waveform, GO gate, active exercise, rest, skip controls, pause/volume/lock, and completion/resume behavior.
- Compare screenshots at the user's current tablet size and desktop size against the handoff references, correcting visible differences before claiming completion.
- Do not publish until the complete authenticated live flow is confirmed and the user requests publishing.
