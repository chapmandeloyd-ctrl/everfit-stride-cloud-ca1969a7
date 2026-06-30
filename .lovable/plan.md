# KSOM360 Premium Onboarding — Build Plan

A complete replacement for the current 6-step `ClientOnboarding.tsx` with a premium, clinically-toned metabolic assessment flow. Existing engine intro/questions stay available but are bypassed when the new flow runs.

## Flow (10 screens)

1. **Welcome** — "Your metabolism tells a story." Animated metabolic ring, particle glow, single CTA.
2. **Body Metrics** — Age, Sex, Height, Weight, Goal Weight (optional). Live body silhouette + sliders.
3. **Activity Level** — 5 premium selectable cards (Sedentary → Athlete) with helper text.
4. **Health & Goals** — Multi-select goal cards (10 options).
5. **Metabolic Snapshot** — Calculated BMI + classification, metabolic strain category, gauge, rings, supportive (never-shaming) copy + "The good news" + improvement cards.
6. **System Intro** — "You don't need another diet." 3 animated cards: FUEL / TRAIN / RESTORE.
7. **Coaching Style** — Guided ("Most Effective", elevated card) vs Self-Guided ("Flexible").
8. **Fasting Synergy** — Recommend ONE based on BMI + activity + age + goals; "See Other Options" reveals the 4 synergies.
9. **First Week Preview** — Premium timeline: fasting/eating window, hydration, movement, recovery, meal previews.
10. **Activate** — Success animation + "Activate My Plan" / "Explore Dashboard".

Top progress indicator on every step. Smooth fade/scale transitions between steps.

## Recommendation logic (client-side)

```text
if BMI >= 30 OR activity in [Sedentary, Lightly]    → Metabolic Reset (12–14h)
elif BMI 25–29.9 AND goals include Fat Loss/Belly   → Fat Loss Accelerator (16:8)
elif activity in [Highly, Athlete] AND age < 45     → Performance Fuel System
elif BMI < 25 AND experience suggests advanced      → Advanced Metabolic Protocol (18:6/OMAD)
else                                                → Fat Loss Accelerator (default)
```

Metabolic score (0–100): weighted BMI band (50%) + activity (30%) + goal alignment (20%).

## Database schema

New migration creates three tables, all with RLS keyed to `auth.uid() = client_id` plus trainer-of-client read access via existing `is_trainer_of_client()`:

- **`onboarding_progress`** — `client_id`, `current_step`, `completed`, `completed_at`, `data jsonb`
- **`user_metabolic_profile`** — `client_id`, `age`, `sex`, `height_cm`, `weight_kg`, `goal_weight_kg`, `bmi`, `bmi_class`, `activity_level`, `goals text[]`, `metabolic_score`, `metabolic_strain`
- **`fasting_synergy_selection`** — `client_id`, `synergy_key`, `coaching_style` (guided|self), `recommended_synergy`, `selected_at`

Also flip `profiles.onboarding_completed = true` on finish (existing column).

## File structure

```text
src/pages/client/ClientOnboarding.tsx          (rewritten — orchestrator)
src/components/onboarding/premium/
  ├─ OnboardingShell.tsx                       (progress bar, transitions, dark bg)
  ├─ steps/
  │   ├─ WelcomeStep.tsx
  │   ├─ BodyMetricsStep.tsx
  │   ├─ ActivityLevelStep.tsx
  │   ├─ GoalsStep.tsx
  │   ├─ MetabolicSnapshotStep.tsx
  │   ├─ SystemIntroStep.tsx
  │   ├─ CoachingStyleStep.tsx
  │   ├─ FastingSynergyStep.tsx
  │   ├─ FirstWeekStep.tsx
  │   └─ ActivateStep.tsx
  ├─ MetabolicGauge.tsx                        (SVG arc gauge)
  ├─ BodySilhouette.tsx                        (SVG, scales by BMI)
  ├─ MetabolicRing.tsx                         (animated SVG ring)
  └─ ParticleField.tsx                         (CSS particles, no heavy lib)
src/lib/onboarding/
  ├─ metabolicCalc.ts                          (BMI, classification, score, strain)
  ├─ synergyRecommender.ts                     (recommendation logic)
  └─ synergies.ts                              (4 synergy definitions)
```

## Styling

- Pure black background (`hsl(var(--background))`) with electric red primary `#CC1A1A` and KSOM-360 teal accents — already in design tokens, no new colors.
- Glassmorphism: `bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl`.
- Space Grotesk headings, Inter body (per project Core).
- Animations: `animate-fade-in`, `animate-scale-in`, custom CSS for ring sweep and particle drift. No new animation libs.
- Mobile-first; max-w-md container; large tap targets.

## Wiring

- Route `/client/onboarding` already exists → keeps same path.
- `useEffectiveClientId()` for client id.
- All writes via supabase client; final step navigates to `/client/dashboard`.
- The legacy `EngineIntroStep`/`EngineQuestionsStep` files are left in place untouched (not imported by new flow) — safe rollback.

## Out of scope

- No changes to fasting timer, dashboard, or any other route.
- No new external libraries.
- No imagery generation — using SVG + CSS gradients for premium look (faster, no asset cost).

## Approval needed

Reply "go" to proceed; I'll run the migration first, then build the components.
