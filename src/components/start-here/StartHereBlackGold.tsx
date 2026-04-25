import lionLogo from "@/assets/logo.png";

/**
 * Variant 3 — Editorial Black & Gold
 * Pure black, ivory serif-feel headline, gold outlined CTA.
 * High-end magazine spread vibe with a faint gold lion watermark
 * filling the background (inspired by variant 1).
 */
export function StartHereBlackGold() {
  return (
    <div
      className="relative px-6 py-16 text-center overflow-hidden"
      style={{ background: "hsl(0 0% 4%)" }}
    >
      {/* Faint gold lion watermark filling the card */}
      <img
        src={lionLogo}
        alt=""
        aria-hidden
        className="absolute inset-0 m-auto w-[120%] h-[120%] object-contain pointer-events-none"
        style={{
          filter: "sepia(1) hue-rotate(-15deg) saturate(2.5) brightness(1.2)",
          opacity: 0.1,
        }}
      />

      {/* Foreground gold lion mark */}
      <img
        src={lionLogo}
        alt=""
        aria-hidden
        className="relative mx-auto w-12 h-12 object-contain mb-4 opacity-90"
        style={{ filter: "sepia(1) hue-rotate(-15deg) saturate(2) brightness(1.1)" }}
      />

      {/* Thin gold divider */}
      <div
        className="relative mx-auto w-12 h-px mb-6"
        style={{ background: "hsl(42 70% 55%)" }}
      />

      <div className="relative space-y-6">
        <div className="space-y-3">
          <p
            className="text-[10px] uppercase tracking-[0.4em]"
            style={{ color: "hsl(42 70% 55%)" }}
          >
            The Protocol
          </p>
          <h3
            className="text-3xl font-light tracking-tight"
            style={{ color: "hsl(40 20% 92%)", fontFamily: "Georgia, serif" }}
          >
            Begin Your Reset
          </h3>
          <p className="text-sm max-w-xs mx-auto" style={{ color: "hsl(40 10% 65%)" }}>
            Select a fasting window curated for your goal.
          </p>
        </div>

        <button
          className="inline-flex items-center justify-center px-10 py-3 font-medium text-sm tracking-widest uppercase transition active:scale-95"
          style={{
            background: "transparent",
            color: "hsl(42 70% 55%)",
            border: "1px solid hsl(42 70% 55%)",
          }}
        >
          Choose Plan
        </button>
      </div>
    </div>
  );
}
