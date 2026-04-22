import { ClientLayout } from "@/components/ClientLayout";
import { InteractiveKetoTypeCard, type KetoTypeForCard } from "@/components/keto/InteractiveKetoTypeCard";
import { useCallback, useMemo, useState } from "react";

const sampleKetoTypes: { theme: string; kt: KetoTypeForCard }[] = [
  {
    theme: "#E4572E",
    kt: {
      abbreviation: "HPKD",
      name: "High Protein Ketogenic Diet",
      subtitle: "Keto with elevated protein for muscle retention",
      description:
        "A modified ketogenic approach that increases protein intake to support muscle preservation and athletic recovery while maintaining ketosis.",
      difficulty: "intermediate",
      fat_pct: 60,
      protein_pct: 35,
      carbs_pct: 5,
      carb_limit_grams: 30,
      how_it_works:
        "Protein is raised to ~1.6–2.2g per kg of body weight while keeping carbs low enough to stay in nutritional ketosis. Fat fills the remaining calories.",
      built_for: [
        "Active clients lifting 3+ days a week",
        "Anyone protecting lean mass during a cut",
        "Athletes who feel flat on standard keto",
      ],
    },
  },
  {
    theme: "#2563eb",
    kt: {
      abbreviation: "SKD",
      name: "Standard Ketogenic Diet",
      subtitle: "Classic high-fat, low-carb baseline",
      description:
        "The original ketogenic protocol — high fat, moderate protein, very low carbs — built for steady fat adaptation and appetite control.",
      difficulty: "beginner",
      fat_pct: 75,
      protein_pct: 20,
      carbs_pct: 5,
      carb_limit_grams: 25,
      how_it_works:
        "Carbs are kept under ~25g/day so the body shifts to using fat and ketones as the primary fuel source within 3–7 days.",
      built_for: [
        "First-time keto clients",
        "Steady, sustainable fat loss",
        "Appetite & energy stabilization",
      ],
    },
  },
  {
    theme: "#7c3aed",
    kt: {
      abbreviation: "TKD",
      name: "Targeted Ketogenic Diet",
      subtitle: "Carbs timed around training",
      description:
        "Keeps you in ketosis most of the day but allows a small dose of fast carbs around workouts to support performance and recovery.",
      difficulty: "advanced",
      fat_pct: 65,
      protein_pct: 25,
      carbs_pct: 10,
      carb_limit_grams: 50,
      how_it_works:
        "20–30g of fast-digesting carbs are taken 30–45 min pre- or post-workout. Ketosis resumes within hours thanks to the surrounding low-carb meals.",
      built_for: [
        "High-intensity training days",
        "Sport-specific performance",
        "Plateau breaks for fat-adapted athletes",
      ],
    },
  },
];

export default function ClientKetoTypeCardDemo() {
  // Collect each card's auto-measured height, then feed back the max so all
  // cards in the list end up the same height (no dead space, no clipping).
  const [heights, setHeights] = useState<Record<string, number>>({});
  const tallest = useMemo(() => {
    const vals = Object.values(heights);
    return vals.length ? Math.max(...vals) : 0;
  }, [heights]);

  const makeOnMeasure = useCallback(
    (key: string) => (h: number) => {
      setHeights((prev) => (prev[key] === h ? prev : { ...prev, [key]: h }));
    },
    []
  );

  return (
    <ClientLayout>
      <div className="max-w-md mx-auto px-4 py-6 space-y-8 pb-32">
        <header className="space-y-1.5">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
            Interaction Preview
          </span>
          <h1 className="text-2xl font-black leading-tight">Keto Type Card · Tap to Flip</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Front matches today's "Your Active Keto Type" hero. Tap the card to flip and see "How
            it works", "Built for", and the macro breakdown on the back.
          </p>
        </header>

        {sampleKetoTypes.map(({ theme, kt }) => (
          <section key={kt.abbreviation} className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex h-6 px-2 items-center justify-center rounded-full text-[10px] font-black uppercase tracking-wider text-primary-foreground"
                style={{ backgroundColor: theme }}
              >
                {kt.abbreviation}
              </span>
              <p className="text-xs text-muted-foreground">{kt.name}</p>
            </div>
            <InteractiveKetoTypeCard
              ketoType={kt}
              themeColor={theme}
              onMeasureHeight={makeOnMeasure(kt.abbreviation)}
              forcedHeight={tallest > 0 ? tallest : undefined}
            />
          </section>
        ))}
      </div>
    </ClientLayout>
  );
}