---
name: Dark mode only for users
description: App is dark-mode only for all users; light-mode toggle is owner-gated
type: preference
---
The app ships in dark mode for everyone. The `ThemeToggle` component in `src/components/ThemeToggle.tsx` returns `null` for any user whose email is not the owner (`ksomfast@yahoo.com`). Default theme in `src/main.tsx` is `dark` with `enableSystem={false}`.

**Why:** Many premium surfaces (DailyRingsCard, SmartPaceBanner, DailyScoreRing, protocol hero cards) use hardcoded `bg-black` / `text-white` for visual hierarchy and are not light-mode safe. Locking users to dark mode avoids broken light-mode rendering.

**How to apply:** Do not add a user-facing light/dark toggle. Do not change the `OWNER_EMAIL` gate without confirmation. If new "always-dark" surfaces are added it is fine; do not refactor them to semantic tokens just to support light mode.
