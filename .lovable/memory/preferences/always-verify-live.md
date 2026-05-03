---
name: Always Verify Work Live
description: User requires live verification (browser/preview screenshot) of every change before claiming it works — no matter how trivial. Never say "it should work" or "it's set up" based on code reading alone.
type: preference
---

**Rule:** Before telling the user a change works or is "set up correctly," ALWAYS verify it live in the preview browser (navigate, click, screenshot). No exceptions, no matter how simple the change appears.

**Why:** User has been repeatedly burned by AI saying "yes it works" based on code-reading assumptions when the live behavior was actually broken or incomplete.

**How to apply:**
- After any code change touching UI/navigation/behavior, use browser tools (navigate_to_sandbox → act/observe → screenshot) to confirm.
- Never answer "yes it's set up" to a verification question without actually loading the page.
- If browser is unavailable, say so explicitly instead of guessing.
