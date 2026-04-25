---
name: Start Here / Choose-Protocol Theme — Editorial Black & Gold + Lion Watermark
description: Visual theme for the new Simple-style fasting onboarding flow (Start Here, Choose Protocol, protocol detail, meal timeline). Pure black background with a large faint gold lion watermark filling the card, ivory serif headlines, and outlined gold CTAs.
type: design
---

The new fasting onboarding flow uses an **Editorial Black & Gold** theme with a **large faint gold lion watermark** filling the background.

**Approved variant:** `src/components/start-here/StartHereBlackGold.tsx` (chosen by user 2026-04-25 over 3 alternatives).

**Color tokens (HSL):**
- Background: `hsl(0 0% 4%)` — pure black
- Headline: `hsl(40 20% 92%)` — warm ivory
- Body / subhead: `hsl(40 10% 65%)` — muted warm gray
- Gold accent (dividers, eyebrow, CTA border, lion tint): `hsl(42 70% 55%)`

**Background lion watermark (required):**
- KSOM logo (`@/assets/logo.png`)
- `absolute inset-0 m-auto w-[120%] h-[120%] object-contain`
- `filter: sepia(1) hue-rotate(-15deg) saturate(2.5) brightness(1.2)` to tint gold
- `opacity: 0.1`
- Always behind content (`pointer-events-none`)

**Typography:**
- Eyebrow: `text-[10px] uppercase tracking-[0.4em]` in gold
- Headline: `text-3xl font-light tracking-tight`, `fontFamily: "Georgia, serif"` in ivory
- Body: `text-sm` ivory-muted

**CTA buttons:**
- Transparent background with `1px solid hsl(42 70% 55%)` border
- Gold text, `tracking-widest uppercase`, `text-sm font-medium`
- Padding `px-10 py-3`, sharp rectangle (no rounded-full)

**Apply this theme to:**
- `/client/choose-protocol` (Phase 2 — protocol list redesign)
- Protocol detail page (Phase 3 — eating window picker, expert authority card)
- Meal timeline (Phase 4)
- Nutrients-to-focus-on section (Phase 5)
- Any future "Start Here" empty states

**Why:** Premium, exclusive, magazine-spread feel that preserves KSOM lion brand identity even on screens where the live timer doesn't appear.
