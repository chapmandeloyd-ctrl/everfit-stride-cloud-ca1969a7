import { useState } from "react";
import { StartHereDarkTeal } from "./StartHereDarkTeal";
import { StartHereCreamTeal } from "./StartHereCreamTeal";
import { StartHereBlackGold } from "./StartHereBlackGold";
import { StartHereGradient } from "./StartHereGradient";

/**
 * TEMPORARY demo gallery — shows 4 themed variants of the
 * "Start Here / Choose Plan" empty state side-by-side so the
 * client can pick a direction before we wire it into the real
 * /client/choose-protocol flow.
 *
 * Lives on /client/dashboard while SHOW_START_HERE_DEMOS=true.
 */

type Variant = {
  id: string;
  label: string;
  description: string;
  Component: React.FC;
};

const VARIANTS: Variant[] = [
  {
    id: "dark-teal",
    label: "1 · Premium Dark + Teal Glow",
    description: "Dark navy, teal accents, faint lion watermark. On-brand with current dashboard.",
    Component: StartHereDarkTeal,
  },
  {
    id: "cream-teal",
    label: "2 · Warm Cream + Teal Pop",
    description: "Soft Simple-style cream background with KSOM teal CTA. Friendly and approachable.",
    Component: StartHereCreamTeal,
  },
  {
    id: "black-gold",
    label: "3 · Editorial Black & Gold",
    description: "Pure black, ivory text, gold CTA. High-end magazine feel.",
    Component: StartHereBlackGold,
  },
  {
    id: "gradient",
    label: "4 · Teal → Deep Navy Gradient",
    description: "Cinematic vertical gradient. Modern and energetic.",
    Component: StartHereGradient,
  },
];

export function StartHereDemoGallery() {
  const [active, setActive] = useState<string | "all">("all");

  const visible = active === "all" ? VARIANTS : VARIANTS.filter((v) => v.id === active);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Design preview</p>
        <h2 className="text-xl font-bold text-foreground">Pick a theme for the new "Start Here" screen</h2>
        <p className="text-sm text-muted-foreground">
          The lion timer & weight tracker are temporarily hidden so you can see each variant clearly.
          Tap a chip to view that one full-size, or scroll to compare all four.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        <button
          onClick={() => setActive("all")}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
            active === "all"
              ? "bg-foreground text-background border-foreground"
              : "bg-background text-muted-foreground border-border"
          }`}
        >
          Compare all
        </button>
        {VARIANTS.map((v) => (
          <button
            key={v.id}
            onClick={() => setActive(v.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              active === v.id
                ? "bg-foreground text-background border-foreground"
                : "bg-background text-muted-foreground border-border"
            }`}
          >
            {v.label.split(" · ")[0]}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {visible.map(({ id, label, description, Component }) => (
          <div key={id} className="space-y-2">
            <div className="px-1">
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <div className="rounded-3xl overflow-hidden border border-border shadow-sm">
              <Component />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
