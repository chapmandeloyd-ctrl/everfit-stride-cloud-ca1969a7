# Narrated AI Demos for Extended Fast & Juice Fast

Same pattern already used by the AI plan-builder demo: a full-screen, voice-narrated walkthrough that explains the fast type before the user commits.

## What gets built

Two new narrated demo pages, each using `OnboardingShell` + `useCaptionNarration` (the same voice engine as the plan demos), with a progress bar, Back arrow, and a chapter per screen.

### 1. Extended Fast demo — 4 steps
1. **What an extended fast is** — 24h+, why it goes beyond the daily window, who it's for.
2. **Pick your length** — 24h / 36h / 48h / 72h explained with what each unlocks (deep ketosis, autophagy, immune reset), plus who should not go past 48h.
3. **The three phases** — Prepare, Fast, Refeed, and why the refeed matters as much as the fast.
4. **Safety + start** — hydration/electrolytes, warning signs, the safety acknowledgment; CTAs: "Start my extended fast" (opens the existing extended sheet), "Back to Home".

### 2. Juice Fast demo — 4 steps
1. **What a juice fast is** — day-based, not window-based; the ring counts Day N of X.
2. **Two modes** — Juice only (strict) vs Juice + light snacks, with who each suits.
3. **Daily rhythm** — the daily log (juice count, water, energy), and that named juices/calories live in Trainerize.
4. **Length + refeed** — 1–3 days self-serve, 4+ requires trainer assignment, refeed day auto-flagged on 3+ day fasts; CTAs: "Start my juice fast" (opens the existing juice sheet), "Back to Home".

## Wiring

- New routes `/client/extended-fast-demo` and `/client/juice-fast-demo` in `App.tsx`, protected the same way as the other demos.
- In `AlternateFastOptions.tsx`, each row inside "More ways to fast" gets a small "How it works" link next to the start button that opens the matching demo. The existing start buttons keep working exactly as they do now — no change to start logic.
- Final CTA on each demo navigates back to the dashboard and opens the corresponding start sheet, so the demo flows straight into the real action.

## Technical notes

- Narration text lives in a `STEP_SCRIPT` map per page, identical to `AIPlanBuilderDemo.tsx`; the global audio registry in `useCaptionNarration` prevents overlap.
- No backend, schema, or fasting-logic changes. Presentation only.
- Legacy `FastingProtocolCard` timer logic untouched.
