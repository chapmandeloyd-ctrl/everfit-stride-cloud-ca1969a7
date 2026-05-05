---
name: No confirmation - just do it
description: Never ask for confirmation on routine implementation steps; always allow trainer role to access/preview client routes by default
type: preference
---
Never ask the user to confirm routine implementation steps (e.g. "Should I add trainer to allowed roles?"). Just do it.

**Always:** When a client-only route needs testing/previewing, automatically include `"trainer"` in the allowed roles so trainers can preview/impersonate without being blocked.

**Why:** User has stated repeatedly they don't want to be asked the same kind of question every time.
