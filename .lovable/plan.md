# Apex360-IF Rebrand + Fasting Library Expansion

Ship in one pass, no data loss, no disruption to existing fasting engine.

## Phase 1 — Brand sweep (Apex360-IF)

- Update app name to **Apex360-IF** everywhere user-facing:
  - `index.html` `<title>`, meta description, og tags
  - `public/manifest.webmanifest` (name + short_name)
  - Auth screen wordmark ("KSOM" → "APEX360-IF")
  - Sidebars, headers, footers, email templates
- Tagline: **"You are WHEN you eat"** — added to login screen and dashboard hero
- Keep `ksom-360.app` domain live; no DNS changes
- Logo (silver lion) stays as-is
- Internal code paths (`ksom360Levels.ts`, DB column names, storage buckets) stay untouched — invisible to users, avoids a risky refactor

## Phase 2 — Eating windows (final lineup)

Rename/relabel existing quick plans:

| Hours | Window | Badge |
|---|---|---|
| 16:8 | 8-hour eating | Beginner |
| 18:6 | 6-hour eating | Intermediate |
| 20:4 | 4-hour eating | Advanced |
| OMAD | 1-hour eating | Advanced |

- Update `quick_fasting_plans` labels/badges via data migration
- Update `QuickPlansSelector.tsx` to render new badge chips (green/yellow/red)

## Phase 3 — Extended Fasts (new, locked by default)

New protocols added to `fasting_protocols`:

- **24 Hour Fast** (1 day) — Advanced
- **48 Hour Fast** (2 day) — Advanced
- **72 Hour Fast** (3 day) — Advanced
- **96 Hour Fast** (4 day) — Advanced

All flagged `is_extended_fast=true`, `is_youth_safe=false`.

## Phase 4 — Access control

**DB:** add 4 boolean columns to `client_feature_settings`:
- `extended_fast_24h_enabled` (default false)
- `extended_fast_48h_enabled` (default false)
- `extended_fast_72h_enabled` (default false)
- `extended_fast_96h_enabled` (default false)

**Client side:** extend `usePlanGating` — if protocol is extended fast, check the matching toggle. If off → show lock icon + "Advanced — Ask your trainer to unlock" sheet.

**Athletic engine clients:** hard-blocked regardless of toggle (safety rule already in place via `is_youth_safe`).

**Trainer side:** new "Extended Fasting Access" card in the client settings panel (`TrainerClientSettings` / feature-flag section) with 4 toggles.

## Phase 5 — Verify

- Playwright: load `/client/choose-protocol` as a test client, confirm new windows show correct badges and extended fasts show locked state
- Load trainer settings for a client, confirm toggles render and persist

## Technical notes

- Two migrations: one for `client_feature_settings` columns (schema), one for seeding new `fasting_protocols` rows and updating `quick_fasting_plans` labels (data — via insert tool)
- No breaking changes to existing fasting timer, macro engine, or protocol scheduling
- Rebrand is pure copy/asset — zero risk to fasting/nutrition logic
- Domain swap is a 5-minute change later; nothing in code hardcodes `ksom-360.app`
