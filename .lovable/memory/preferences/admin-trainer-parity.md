---
name: Admin / Trainer View Parity Rule
description: When making any visual or feature change to the client view, the AI must also apply or verify the equivalent change in the admin/trainer view (impersonation, "Preview as Client", trainer-side dashboards). Never ship a change that only updates one side.
type: preference
---

When the user requests a UI change, hide/show toggle, theme update, or feature addition on the **client view**, the AI MUST also:

1. **Identify the matching admin / trainer surface(s)** that render the same component or feature, including:
   - The trainer dashboard (`src/pages/TrainerDashboard.tsx`, `src/pages/Dashboard.tsx`)
   - "Preview as Client" / impersonation routes (these usually share `/client/*` routes via `useImpersonation`)
   - Trainer-side variants of client pages (e.g. `TrainerClientHealth.tsx`)
   - Any settings or admin panels that surface the same widget

2. **Apply the same change** (or its admin-appropriate equivalent) in the same edit batch.

3. **Confirm in the response** which views were updated, e.g. "Hidden in both client dashboard and trainer impersonation view."

**Why:** The user runs the app as both trainer and client. When something only changes on one side, they hit it again from the other side and have to re-flag it.

**How to apply:**
- Before finishing any client-side UI change, run `rg -ln "<ComponentName>" src/pages src/components` to find every render site.
- If the change is a feature flag, put it in the shared component so it cascades automatically.
- If client and trainer have separate components, edit both.
