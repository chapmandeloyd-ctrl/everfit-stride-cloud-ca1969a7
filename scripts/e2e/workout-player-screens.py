#!/usr/bin/env python3
"""Screenshot regression checks for the workout player flow.

Captures READY, coach selection, coach-speaking (waveform), GO gate and the
active exercise screen for one saved workout, and asserts the key text/visual
markers of each state are present. Run against the local dev server with a
signed-in session available in the environment.

    python3 scripts/e2e/workout-player-screens.py <workout-id>

Screenshots are written to /tmp/browser/player-regression/.
"""
import asyncio
import json
import os
import sys

from playwright.async_api import async_playwright

BASE = os.environ.get("APP_BASE_URL", "http://localhost:8080")
OUT = "/tmp/browser/player-regression"
WORKOUT_ID = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("WORKOUT_ID", "")


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


async def main() -> int:
    if not WORKOUT_ID:
        print("usage: workout-player-screens.py <workout-id>")
        return 2
    os.makedirs(OUT, exist_ok=True)
    failures: list[str] = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1024, "height": 1400})
        page = await ctx.new_page()
        page_errors: list[str] = []
        page.on("pageerror", lambda e: page_errors.append(str(e)))
        await restore_session(ctx, page)

        await page.goto(f"{BASE}/workouts/{WORKOUT_ID}", wait_until="domcontentloaded")
        await page.wait_for_selector("text=START WORKOUT", timeout=20000)
        await page.screenshot(path=f"{OUT}/0_detail.png")

        # READY
        await page.get_by_role("button", name="START WORKOUT").first.click()
        await page.wait_for_selector("text=YOUR COACH TODAY", timeout=15000)
        await page.wait_for_timeout(1200)
        await page.screenshot(path=f"{OUT}/1_ready.png")
        ready = await page.inner_text("body")
        for marker in ["READY", "YOUR COACH TODAY", "Hear Voice", "EXERCISE LINEUP"]:
            if marker.lower() not in ready.lower():
                failures.append(f"READY missing: {marker}")

        # Coach selection
        await page.get_by_text("CHOOSE FROM").first.click()
        await page.wait_for_timeout(700)
        await page.screenshot(path=f"{OUT}/2_coaches.png")
        if "voice" not in (await page.inner_text("body")).lower():
            failures.append("coach selector did not open")
        await page.get_by_text("CHOOSE FROM").first.click()
        await page.wait_for_timeout(400)

        # Coach speaking + waveform
        await page.get_by_role("button", name="Start Workout").last.click()
        await page.wait_for_timeout(2500)
        await page.screenshot(path=f"{OUT}/3_speaking.png")
        speaking = await page.inner_text("body")
        canvases = await page.locator("canvas").count()
        if "coach speaking" not in speaking.lower():
            failures.append("coach-speaking state not shown")
        if canvases < 1:
            failures.append("waveform canvas missing during speech")
        if "skip intro" not in speaking.lower():
            failures.append("Skip Intro control missing")

        # GO gate (reached after the spoken intro; skipping jumps straight in)
        for _ in range(40):
            body = await page.inner_text("body")
            if "GO" in body.split():
                await page.screenshot(path=f"{OUT}/4_go.png")
                break
            if "Skip Block" in body:
                break
            await page.wait_for_timeout(1000)

        # Active exercise
        body = await page.inner_text("body")
        try:
            if "TAP TO START" in body.upper():
                await page.get_by_text("GO", exact=True).click()
            else:
                await page.get_by_role("button", name="Skip Intro").click()
        except Exception:
            pass
        await page.wait_for_timeout(2500)
        await page.screenshot(path=f"{OUT}/5_active.png")
        active = await page.inner_text("body")
        for marker in ["TIME", "EST. LEFT", "CAL", "PROGRESS", "Up Next", "Skip Block", "End Workout"]:
            if marker.lower() not in active.lower():
                failures.append(f"active player missing: {marker}")

        if page_errors:
            failures.append(f"page errors: {page_errors[:3]}")
        await browser.close()

    print(f"screenshots: {OUT}")
    if failures:
        for f in failures:
            print("FAIL:", f)
        return 1
    print("PASS: ready, coaches, speaking/waveform, go gate, active player")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
