#!/usr/bin/env python3
"""Signed-in tablet end-to-end walk from the workout detail page to GO.

Runs the whole walk on several common tablet sizes. Asserts every state
renders, that nothing hangs (each state has a hard deadline), and that the
coach-speaking waveform appears with the spoken overlay and clears when the
coach stops.

    python3 scripts/e2e/ready-to-go-tablet.py <workout-id>

Screenshots go to /tmp/browser/ready-to-go-tablet/<viewport>/. When a run
fails, a video, a Playwright trace and the console log are kept in the same
folder; they are discarded on a clean run.
"""
import asyncio
import json
import os
import shutil
import sys
import time

from playwright.async_api import async_playwright

BASE = os.environ.get("APP_BASE_URL", "http://localhost:8080")
OUT = "/tmp/browser/ready-to-go-tablet"
WORKOUT_ID = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("WORKOUT_ID", "")

# Common tablet resolutions (portrait + landscape working areas).
VIEWPORTS = [
    ("ipad-mini-768", {"width": 768, "height": 1024}),
    ("ipad-1024", {"width": 1024, "height": 1400}),
    ("ipad-pro-1180", {"width": 1180, "height": 1024}),
]
# Any single state that takes longer than this counts as a hang.
STATE_DEADLINE_MS = 20000


async def restore_session(ctx, page):
    cookies = os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON")
    if cookies:
        await ctx.add_cookies([{**c, "url": BASE} for c in json.loads(cookies)])
    await page.goto(BASE, wait_until="domcontentloaded")
    key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
    session = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
    if key and session:
        await page.evaluate(
            f"localStorage.setItem({json.dumps(key)}, {json.dumps(session)})"
        )


async def expect_state(page, failures, out, label, selector, shot):
    """Wait for a state, failing (rather than hanging) when it never arrives."""
    started = time.time()
    try:
        await page.wait_for_selector(selector, timeout=STATE_DEADLINE_MS)
    except Exception:
        failures.append(f"{label}: never rendered within {STATE_DEADLINE_MS}ms (hang)")
        await page.screenshot(path=f"{out}/{shot}_HANG.png")
        return False
    await page.wait_for_timeout(600)
    await page.screenshot(path=f"{out}/{shot}.png")
    print(f"  ok {label} ({time.time() - started:.1f}s)")
    return True


async def walk(page, failures, out):
    # 1. Detail page (must resolve, never sit on a spinner)
    await page.goto(f"{BASE}/workouts/{WORKOUT_ID}", wait_until="domcontentloaded")
    if not await expect_state(page, failures, out, "detail", "text=START WORKOUT", "1_detail"):
        return
    if "couldn't load this workout" in (await page.inner_text("body")).lower():
        failures.append("detail: error state shown instead of workout")

    # 2. READY overview
    await page.get_by_role("button", name="START WORKOUT").first.click()
    await expect_state(page, failures, out, "ready", "text=YOUR COACH TODAY", "2_ready")
    ready = await page.inner_text("body")
    for marker in ["READY", "YOUR COACH TODAY", "Hear Voice", "EXERCISE LINEUP"]:
        if marker.lower() not in ready.lower():
            failures.append(f"READY missing: {marker}")

    # 3. Coach selection
    await page.get_by_text("CHOOSE FROM").first.click()
    await expect_state(page, failures, out, "coach selection", "text=Hear Voice", "3_coaches")
    if "voice" not in (await page.inner_text("body")).lower():
        failures.append("coach selector did not open")
    await page.get_by_text("CHOOSE FROM").first.click()
    await page.wait_for_timeout(400)

    # 4. Coach speaking + waveform alignment
    await page.get_by_role("button", name="Start Workout").last.click()
    spoke = await expect_state(
        page, failures, out, "coach speaking", "text=COACH SPEAKING", "4_speaking"
    )
    if spoke:
        if await page.locator("canvas").count() < 1:
            failures.append("waveform canvas missing while overlay says COACH SPEAKING")
        if "skip intro" not in (await page.inner_text("body")).lower():
            failures.append("Skip Intro control missing during speech")
        # Waveform must clear once the spoken overlay does.
        for _ in range(int(STATE_DEADLINE_MS / 500)):
            body = await page.inner_text("body")
            if "COACH SPEAKING" not in body.upper():
                if await page.locator("canvas").count() > 0:
                    failures.append("waveform still visible after coach stopped speaking")
                break
            await page.wait_for_timeout(500)

    # 5. GO gate
    reached_go = False
    for _ in range(int(STATE_DEADLINE_MS / 500)):
        body = await page.inner_text("body")
        if "GO" in body.split():
            reached_go = True
            await page.screenshot(path=f"{out}/5_go.png")
            break
        if "Skip Block" in body:
            break
        await page.wait_for_timeout(500)
    if not reached_go and "Skip Block" not in (await page.inner_text("body")):
        failures.append("GO gate never appeared (hang between speech and GO)")

    # 6. Active player
    body = await page.inner_text("body")
    try:
        if "TAP TO START" in body.upper():
            await page.get_by_text("GO", exact=True).click()
        else:
            await page.get_by_role("button", name="Skip Intro").click()
    except Exception:
        pass
    await expect_state(page, failures, out, "active player", "text=Up Next", "6_active")
    active = await page.inner_text("body")
    for marker in ["TIME", "EST. LEFT", "CAL", "PROGRESS", "Skip Block", "End Workout"]:
        if marker.lower() not in active.lower():
            failures.append(f"active player missing: {marker}")


async def run_viewport(p, name, viewport) -> list[str]:
    out = f"{OUT}/{name}"
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(out, exist_ok=True)
    failures: list[str] = []
    console: list[str] = []

    browser = await p.chromium.launch(headless=True)
    ctx = await browser.new_context(viewport=viewport, record_video_dir=f"{out}/video")
    await ctx.tracing.start(screenshots=True, snapshots=True, sources=True)
    page = await ctx.new_page()
    page.on("pageerror", lambda e: console.append(f"pageerror: {e}"))
    page.on("console", lambda m: console.append(f"{m.type}: {m.text}"))

    try:
        await restore_session(ctx, page)
        await walk(page, failures, out)
    except Exception as exc:  # unexpected crash is a failure, not a stack trace
        failures.append(f"unexpected error: {exc}")

    errors = [c for c in console if c.startswith(("pageerror", "error"))]
    if errors:
        failures.append(f"page errors: {errors[:3]}")

    if failures:
        # Keep diagnostics only for failing runs.
        await ctx.tracing.stop(path=f"{out}/trace.zip")
        with open(f"{out}/console.log", "w") as fh:
            fh.write("\n".join(console))
        await ctx.close()
    else:
        await ctx.tracing.stop()
        await ctx.close()
        shutil.rmtree(f"{out}/video", ignore_errors=True)
    await browser.close()
    return failures


async def main() -> int:
    if not WORKOUT_ID:
        print("usage: ready-to-go-tablet.py <workout-id>")
        return 2
    os.makedirs(OUT, exist_ok=True)
    all_failures: dict[str, list[str]] = {}

    async with async_playwright() as p:
        for name, viewport in VIEWPORTS:
            print(f"[{name}] {viewport['width']}x{viewport['height']}")
            failures = await run_viewport(p, name, viewport)
            if failures:
                all_failures[name] = failures

    print(f"artifacts: {OUT}")
    if all_failures:
        for name, failures in all_failures.items():
            for f in failures:
                print(f"FAIL [{name}]:", f)
            print(f"  diagnostics: {OUT}/{name}/trace.zip, video/, console.log")
        return 1
    print("PASS on all tablet sizes: detail → ready → coaches → speaking/waveform → go → active")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
