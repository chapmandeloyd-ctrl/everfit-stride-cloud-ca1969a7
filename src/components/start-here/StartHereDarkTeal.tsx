import lionLogo from "@/assets/logo.png";

/**
 * Variant 1 — Premium Dark + Teal Glow
 * Dark navy background, teal CTA with subtle glow, faint lion watermark.
 * Matches the existing premium feel of the KSOM dashboard.
 */
export function StartHereDarkTeal() {
  return (
    <div
      className="relative px-6 py-12 text-center overflow-hidden"
      style={{ background: "linear-gradient(180deg, hsl(215 35% 12%) 0%, hsl(215 40% 8%) 100%)" }}
    >
      {/* Faint lion watermark */}
      <img
        src={lionLogo}
        alt=""
        aria-hidden
        className="absolute inset-0 m-auto w-64 h-64 object-contain opacity-[0.06] pointer-events-none"
      />

      {/* Teal radial glow behind CTA */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, hsla(180, 70%, 45%, 0.18) 0%, transparent 60%)" }}
      />

      <div className="relative space-y-6">
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "hsl(180 70% 60%)" }}>
            KSOM-360
          </p>
          <h3 className="text-3xl font-bold" style={{ color: "hsl(0 0% 98%)" }}>
            Start Here
          </h3>
          <p className="text-sm max-w-xs mx-auto" style={{ color: "hsl(0 0% 70%)" }}>
            Choose a fasting protocol built around your goal.
          </p>
        </div>

        <button
          className="inline-flex items-center justify-center px-10 py-3.5 rounded-full font-semibold text-sm shadow-lg transition active:scale-95"
          style={{
            background: "linear-gradient(135deg, hsl(180 70% 45%) 0%, hsl(180 75% 38%) 100%)",
            color: "hsl(215 40% 8%)",
            boxShadow: "0 0 32px hsla(180, 70%, 45%, 0.4)",
          }}
        >
          Choose Plan
        </button>
      </div>
    </div>
  );
}
