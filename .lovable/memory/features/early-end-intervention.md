---
name: Early End Intervention System
description: Coaching sheet that intercepts End Fast / End Eating Window taps, captures reason, and logs to early_session_ends table for adaptive engine
type: feature
---

When a user taps "End Fast" before the target hours, `EndFastEarlySheet` opens (not a direct mutation).
- Step 1 ("coach"): Static stage-based diagnosis (0-4h food noise, 4-8h glucose dip, 8-12h boredom, 12h+ deep fast) + 3 actionable suggestions (coffee, water, walk, breathing). AI personalized line streams in via `coach-fast-intervention` edge function (gemini-3-flash-preview, hybrid pattern — fails silently if rate-limited).
- Step 2 ("reason"): User picks why they ended (done / real_hunger / headache / social / food_noise / low_energy / other) + optional note.
- Then `endFastMutation.mutate(meta)` runs and logs to `early_session_ends` table.

Eating window has a lighter `EndEatingWindowEarlySheet` (no AI, just reason chips: done_eating / not_hungry / extend_fast / schedule / other). Two intents: `end_window` and `choose_next_fast`.

Table `early_session_ends` columns: client_id, session_type ('fast'|'eating_window'), elapsed_hours, target_hours, percent_complete, reason, action_attempted, ai_suggestion_shown, ai_suggestion_text, note. RLS: client own + trainer-of-client read.

Files: `src/components/fasting/EndFastEarlySheet.tsx`, `src/components/fasting/EndEatingWindowEarlySheet.tsx`, `supabase/functions/coach-fast-intervention/index.ts`. Wired into `FastingProtocolCard` in `ClientDashboard.tsx`. Did NOT modify the legacy `FastingTimer` per memory constraint.

Note: a secondary inline End Fast button at ClientDashboard.tsx ~line 2630 (Metabolic Control surface) was NOT wired to the sheet yet — separate scope.
