/**
 * Variant 2 — Warm Cream + Teal Pop
 * Soft Simple-style cream background. Big teal pill CTA. Friendly.
 */
export function StartHereCreamTeal() {
  return (
    <div
      className="relative px-6 py-14 text-center overflow-hidden"
      style={{ background: "hsl(36 50% 96%)" }}
    >
      {/* Decorative pastel circles */}
      <div
        className="absolute -top-12 -left-10 w-40 h-40 rounded-full opacity-50 pointer-events-none"
        style={{ background: "hsl(150 50% 88%)" }}
      />
      <div
        className="absolute -bottom-16 -right-10 w-48 h-48 rounded-full opacity-50 pointer-events-none"
        style={{ background: "hsl(20 70% 90%)" }}
      />
      <div
        className="absolute top-8 right-8 w-16 h-16 rounded-full opacity-40 pointer-events-none"
        style={{ background: "hsl(45 80% 85%)" }}
      />

      <div className="relative space-y-6">
        <div className="space-y-2">
          <h3 className="text-3xl font-bold" style={{ color: "hsl(215 35% 18%)" }}>
            Start Here
          </h3>
          <p className="text-sm max-w-xs mx-auto" style={{ color: "hsl(215 15% 40%)" }}>
            Let's choose a Fasting Plan that suits you best.
          </p>
        </div>

        <button
          className="inline-flex items-center justify-center px-12 py-4 rounded-full font-semibold text-base shadow-md transition active:scale-95"
          style={{
            background: "hsl(168 65% 45%)",
            color: "hsl(0 0% 100%)",
            boxShadow: "0 8px 24px -8px hsla(168, 65%, 45%, 0.5)",
          }}
        >
          Choose Plan
        </button>
      </div>
    </div>
  );
}
