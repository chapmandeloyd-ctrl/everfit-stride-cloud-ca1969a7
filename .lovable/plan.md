

## Problem
The swipe-down gesture isn't triggering because the **Play/Pause button (`absolute inset-0`) covers the entire circular preview**, intercepting pointer events before framer-motion's drag handler can read them. On desktop especially, mouse-down on the button doesn't propagate as a drag start.

Secondary issues:
- 120px drag threshold is too strict for the small circle on desktop
- No visual feedback during drag (the circle doesn't actually follow the finger far enough)
- ChevronDown hint button is also competing with draggable area

## Fix Plan

**1. Restructure the circle layout (`PortalPlayer.tsx`)**
- Make the play/pause button a small centered control (~64px), NOT a full-overlay button
- This frees up the rest of the circle as a clean drag surface
- Keep `e.stopPropagation()` on the button so taps don't trigger drags

**2. Improve drag responsiveness**
- Lower threshold from `120px` → `80px` (or velocity > 300)
- Increase `dragElastic` to `0.7` so the circle visibly follows the cursor more
- Add `onDrag` console feedback removed; add visual scale/opacity transform tied to dragY for clear feedback

**3. Add a dedicated "Tap to enter" fallback**
- Add an explicit **"Enter Portal"** button below the swipe hint
- Guarantees the immersive mode is reachable even if drag fails on a given device
- Same pattern Portal app uses (chevron is tappable too)

**4. Make the chevron hint clickable**
- Wrap the "Swipe down to enter" hint in a button that triggers `setImmersive(true)` on click
- Best of both worlds: gesture for mobile, tap for desktop

**5. Same treatment in immersive mode**
- "Swipe up to exit" chevron becomes tappable to collapse back

## Technical Detail
```text
BEFORE                          AFTER
┌─────────────────┐            ┌─────────────────┐
│ [drag wrapper]  │            │ [drag wrapper]  │
│  ┌───────────┐  │            │  ┌───────────┐  │
│  │ <video>   │  │            │  │ <video>   │  │
│  │           │  │            │  │           │  │
│  │ [BUTTON   │  │  →         │  │   [btn]   │  │ ← small centered
│  │  inset-0] │  │            │  │           │  │   button only
│  │  blocks   │  │            │  │           │  │
│  │  drag     │  │            │  └───────────┘  │
│  └───────────┘  │            │                 │
└─────────────────┘            └─────────────────┘
```

No database/migration changes needed — purely a UI/gesture fix in `src/components/portal/PortalPlayer.tsx`.

