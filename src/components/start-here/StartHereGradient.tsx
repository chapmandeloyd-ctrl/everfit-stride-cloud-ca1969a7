import lionLogo from "@/assets/logo.png";

/**
 * Variant 4 — Teal → Deep Navy Gradient
 * Cinematic vertical gradient. Modern, energetic, striking.
 */
export function StartHereGradient() {
  return (
    <div
      className="relative px-6 py-14 text-center overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, hsl(180 70% 42%) 0%, hsl(195 60% 28%) 50%, hsl(215 50% 14%) 100%)",
      }}
    >
      {/* Subtle noise/light shimmer */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, hsla(0, 0%, 100%, 0.15) 0%, transparent 40%)",
        }}
      />

      {/* Lion in white at top */}
      <img
        src={lionLogo}
        alt=""
        aria-hidden
        className="relative mx-auto w-14 h-14 object-contain mb-4"
        style={{ filter: "brightness(0) invert(1)", opacity: 0.85 }}
      />

      <div className="relative space-y-6">
        <div className="space-y-2">
          <h3 className="text-3xl font-bold" style={{ color: "hsl(0 0% 100%)" }}>
            Your Reset Starts Here
          </h3>
          <p
            className="text-sm max-w-xs mx-auto"
            style={{ color: "hsla(0, 0%, 100%, 0.8)" }}
          >
            Pick the fasting window that fits your day.
          </p>
        </div>

        <button
          className="inline-flex items-center justify-center px-12 py-4 rounded-full font-semibold text-base transition active:scale-95"
          style={{
            background: "hsl(0 0% 100%)",
            color: "hsl(195 60% 28%)",
            boxShadow: "0 12px 32px -8px hsla(0, 0%, 0%, 0.3)",
          }}
        >
          Choose Plan
        </button>
      </div>
    </div>
  );
}
