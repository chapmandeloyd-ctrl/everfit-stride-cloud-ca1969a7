# Full Plan Mode Demo + Entry Flow

## Problem

The dashboard "Build full calendar" button currently drops the user into the manual day-by-day calendar (`/client/calendar`). The calendar is actually the quick daily editor; the user expected a guided **Full Plan Mode** that explains and demos the full weekly builder before they have to use it.

## Goal

Create a distinct, skippable **Full Plan Mode demo** that explains what the full plan builder does, walks through each section, and then lands the user in the actual builder pre-loaded for manual entry.

## What to build

### 1. New entry point

- Rename dashboard button from **"Build full calendar"** to **"Build full plan"**.
- Route that button to `/client/plan-builder-demo` (new demo shell) instead of `/client/calendar`.
- Keep the calendar day-tap path as the quick daily editor; do not change it.

### 2. Demo shell page (`/client/plan-builder-demo`)

A new full-screen mobile-first shell, matching the existing onboarding dark/gradient style:

- **Intro slide**: "You are now entering Full Plan Mode" + one sentence: "Build a complete weekly fasting rhythm with fuel style, calories, macros, and daily windows."
- **What it is slide**: Explain the four sections of the builder (Fuel Style & Protocol, Your Numbers, How Long It Runs, Weekly Fasting Schedule). One sentence per section, no form inputs.
- **Demo walkthrough slide**: Show a read-only preview of each section in sequence using sample data (e.g., Balance fuel style, 16:8, 180 lbs, Maintain, Moderate). Use the actual UI components but disable saving.
- **Start building slide**: CTA "Build my full plan now" routes to `/client/plan-builder` and a secondary "I'll adjust day-by-day" routes to `/client/calendar`.

The demo must be **skippable** via a "Skip demo" top-right text button that jumps directly to `/client/plan-builder`.

### 3. Plan builder "manual mode" flag

- Pass `?mode=manual` from the demo's primary CTA to `/client/plan-builder`.
- In `ClientPlanBuilder`, when `mode=manual`, default all inputs to neutral/empty (no AI prefill) and show a small banner: "Full Plan Mode — set your weekly rhythm here. Daily tweaks stay in the calendar."
- The AI onboarding path (`/client/onboarding`) continues to prefill results as before; do not change it.

### 4. Labels / clarity

- In `ClientPlanBuilder`, update the header subtitle from "Full program: fuel style, calories, macros, and weekly schedule." to "Weekly rhythm, fuel style, calories, and macros. Daily edits stay in your calendar."
- In `ClientFastingCalendar`, update the bottom CTA from "Build my full plan" to "Build or reset my full plan" and add a 1-line subtitle: "The calendar edits single days. Tap here to change the whole weekly pattern."

### 5. Tracking

- Persist a `plan_demo_completed` flag in `localStorage` so repeat users don't see the demo every time. If the flag exists, `/client/plan-builder-demo` auto-redirects to `/client/plan-builder`.

## Verification

- Log in as a client in the browser, tap the dashboard "Build full plan" button, walk through the demo, confirm it lands on `/client/plan-builder?mode=manual` with the banner showing.
- Verify the calendar still opens the day editor on day taps.
- Verify repeat visits skip the demo.
- Provide screenshots.

## Technical notes

- Reuse existing `OnboardingShell` style and dark-themed components.
- Do not duplicate the builder logic; the demo uses static read-only props and only routes to the real builder.
- No backend changes. No changes to `FastingProtocolCard` or live timer logic.
