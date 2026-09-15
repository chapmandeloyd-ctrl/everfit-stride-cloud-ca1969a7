# Apply Exact Workout Handoff Screens

## Scope
- Port the exact handoff workout library-card presentation into the existing workout library.
- Port the exact handoff workout detail/preview presentation into the existing workout detail page.
- Keep the current APEXBEAST fonts, red/black/teal theme, routes, authentication, database shape, workout player, scheduling, assignment, editing, deletion, and completion behavior.
- Do not change fasting, nutrition, login, workout-generation logic, or unrelated screens.

## Implementation
- Reuse the handoff markup for cover imagery, titles, metadata, actions, workout totals, block headings, type/round badges, coach narration panels, exercise rows, timing, cues, and between-block rest notices.
- Translate only the handoff’s routing and field names to the current React Router and workout-plan data already used by this app.
- Keep all exercise and cover images fully visible using fit-without-cropping behavior.
- Use existing design tokens and shared controls rather than introducing a second design system.

## Verification and Release
- Confirm the app builds without errors.
- Sign into the live preview and test the workout library and a generated workout detail on iPad-sized and desktop screens.
- Verify images fit, scrolling works, controls remain functional, and the handoff sections render from real workout data.
- Run the required security check, then publish the verified update to the existing public app and custom domain.
