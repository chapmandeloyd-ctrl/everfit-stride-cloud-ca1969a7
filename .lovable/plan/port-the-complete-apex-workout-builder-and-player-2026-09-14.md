# Port the Complete APEX Workout Builder and Player

## Goal
Bring the uploaded workout-builder handoff into APEXBEAST-IF with the same visible screens, controls, coaching flow, and workout behavior. Preserve this app’s branding, sign-in system, 819 existing exercises/videos, client assignments, and all fasting features.

## What will be added

### 1. Full workout creation and editing
- Replace the current create/edit experience with the handoff’s single full builder adapted to this app’s navigation.
- Keep the opening choice: **AI Builder** or **Build Your Own**.
- Include all 12 requested block types: Warm-Up, Working Sets, Power/Explosive, Conditioning, HIIT, Accessory/Isolation, Cool Down/Mobility, Finisher, Skill/Drill, Regular, Circuit, and Superset.
- Preserve block ordering, exercise ordering, rounds, rest, sets, reps, duration, weight, tempo, drop sets, side mode, cardio intervals, notes, and spoken block introductions.
- Add draft recovery so an unfinished new workout can be restored.
- Keep the requested removal of Audience and Shared Across Tracks controls.

### 2. Exercise library inside the builder
- Use the existing 819-exercise catalog and its current video/image links; do not import duplicate exercise rows from the archive.
- Port the handoff’s search, sorting, equipment filters, counts, video previews, and add-to-block flow.
- Retain custom exercise creation with thumbnail/video upload through the app’s existing exercise library and storage flow.
- Ensure the builder remains usable on iPhone, iPad, and desktop rather than copying desktop-only dimensions literally.

### 3. AI workout creation and AI Fill
- Port the handoff’s plain-language AI Builder and structured workout result.
- Add AI Fill for workout name, description, tags, block titles, spoken block introductions, and exercise coaching cues.
- Adapt the handoff’s server-only Remix functions into this app’s existing protected cloud-function pattern.
- Reuse the existing Lovable AI connection; never expose keys in browser code.

### 4. Coach voice and workout playback
- Port the coach voice picker, sample playback, waveform, workout intro, block introductions, start/mid-set cues, side-switch cues, and coach outro.
- Port the complete player behavior: exercise video playback, set logging, rest timers, circuit rounds, supersets, cardio intervals, wake lock, calorie estimate, previous-performance values, skip exercise, skip block, pause/resume, save for later, and early-end reasons.
- Keep wall-clock session persistence so leaving or locking the device does not reset elapsed time.
- Ensure skipped or empty blocks cannot create phantom rest screens or jump to completion.

### 5. Detail and completion screens
- Port the workout list, pre-workout detail screen, and completion summary from the handoff.
- Connect completion results to the current client workout assignment and workout-session records so the Today experience updates correctly.
- Preserve trainer-created workout ownership and current client scheduling behavior.

## Data compatibility and security
- Do **not** run the handoff schema unchanged. It defines conflicting `exercises`, `user_roles`, roles, workouts, assignments, and completion tables that would damage the current app.
- Add only the missing fields needed by the handoff to the existing `workout_plans`, `workout_sections`, `workout_plan_exercises`, and `workout_sessions` model.
- Keep roles in the existing dedicated role table and translate the handoff’s admin checks to this app’s trainer authorization.
- Add grants and row-level access rules in the same migration for every changed or new data surface.
- Provide the migration as code for review/application, following the project’s existing database workflow.
- Reuse or extend the existing `workout-covers` and workout-video storage configuration instead of creating duplicate storage paths.

## Technical adaptation
- Convert the uploaded TanStack Start/Router route files into React 18 + React Router pages and components used by this project.
- Replace handoff server functions and `/api/*` handlers with authenticated cloud functions.
- Keep this project’s generated database client, auth provider, UI primitives, tokens, and theme; do not overwrite them with the archive copies.
- Break the two very large handoff screens into focused builder/player components while preserving their user-visible behavior and sequence.
- Add only dependencies that are genuinely missing; do not install the handoff’s incompatible router/server framework.

## Verification
- Verify live with the signed-in trainer and client flows on desktop and a 440px mobile viewport.
- Create one manual workout containing regular, circuit, superset, timed, unilateral, and cardio work.
- Create one workout through AI and run AI Fill.
- Edit and reopen the saved workout to confirm every field persists.
- Play the complete workout and verify videos, voice, timers, rounds, rests, set logging, skip controls, early end, resume, and completion.
- Confirm the client’s Today assignment completes and no fasting screens or data changed.
- Check the latest build, browser console, network requests, and security scan before reporting completion.

## Delivery boundary
This is an exact feature and experience port, not a raw file overwrite. The archive uses a different app framework and conflicting table names, so literal copying would break APEXBEAST-IF. The adapted implementation will match the handoff while remaining compatible with the current app and its existing data.
