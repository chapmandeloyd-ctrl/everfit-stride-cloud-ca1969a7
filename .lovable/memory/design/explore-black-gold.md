---
name: Explore Tab — Editorial Black & Gold + Lion Watermark
description: Explore (Home/Learn/Challenges), content detail, and challenge detail all share the Editorial Black & Gold theme with faint gold lion watermark, Georgia serif headlines, gold hairlines, and outlined gold CTAs. Reuses LionWatermark component.
type: design
---

The Explore system uses the same **Editorial Black & Gold** theme as Start Here / Choose Protocol.

**Tokens (HSL):**
- BG `hsl(0 0% 4%)`, SURFACE `hsl(0 0% 6%)`
- GOLD `hsl(42 70% 55%)`, IVORY `hsl(40 20% 92%)`, MUTED `hsl(40 10% 65%)`
- HAIRLINE `hsl(42 70% 55% / 0.25)`

**Patterns:**
- Section headers: gold hairline + uppercase Georgia serif `tracking-[0.4em]` label
- Cards: `bg: SURFACE`, `border: HAIRLINE`, no rounded corners (sharp rectangles)
- Tabs: gold underline (32px) on active; no fills
- CTAs: transparent + 1px gold border, `tracking-[0.4em] uppercase`
- Pillar accents (Fuel/Train/Restore): differentiated by **eyebrow label only**, all share gold
- Challenge badges: hexagonal clip-path, dark surface with gold border + serif label
- Lion watermark: `LionWatermark` component, opacity 0.04–0.14 by surface size

**Reusable component:** `src/components/explore/LionWatermark.tsx`
