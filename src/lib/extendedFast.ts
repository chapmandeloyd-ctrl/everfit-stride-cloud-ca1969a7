/**
 * Extended fast protocols (24h+) modelled as three phases:
 *   Prepare  → taper carbs, load electrolytes, last meal guidance
 *   Fast     → the actual fasting window (drives the existing timer)
 *   Refeed   → guided break-fast ramp back to normal meals
 *
 * This module is pure math + copy. It never touches the legacy fasting
 * timer logic — starting an extended fast simply sets the fast target
 * hours through the existing start-fast mutation.
 */

export type ExtendedPhaseId = "prepare" | "fast" | "refeed";

export interface ExtendedFastPreset {
  id: string;
  label: string;
  shortLabel: string;
  /** Hours in each phase. */
  prepareHours: number;
  fastHours: number;
  refeedHours: number;
  level: "Intermediate" | "Advanced" | "Elite";
  description: string;
  benefits: string[];
}

export const EXTENDED_FAST_PRESETS: ExtendedFastPreset[] = [
  {
    id: "ext24",
    label: "24 hour fast",
    shortLabel: "24h",
    prepareHours: 12,
    fastHours: 24,
    refeedHours: 6,
    level: "Intermediate",
    description:
      "One full day without food. The cleanest way to feel what deep fat-burning actually feels like.",
    benefits: [
      "Glycogen fully drained — the body flips to fat for fuel",
      "Growth hormone climbs sharply after hour 18",
      "Digestive system gets a complete reset",
    ],
  },
  {
    id: "ext36",
    label: "36 hour fast",
    shortLabel: "36h",
    prepareHours: 12,
    fastHours: 36,
    refeedHours: 8,
    level: "Advanced",
    description:
      "A full day plus a night. Ketones stay elevated through a second sleep cycle.",
    benefits: [
      "Sustained ketosis through the whole second night",
      "Deeper insulin sensitivity reset than a 24",
      "Autophagy signalling ramps up meaningfully",
    ],
  },
  {
    id: "ext48",
    label: "48 hour fast",
    shortLabel: "48h",
    prepareHours: 24,
    fastHours: 48,
    refeedHours: 12,
    level: "Advanced",
    description:
      "Two full days. Requires real preparation and a slow, deliberate refeed.",
    benefits: [
      "Peak autophagy — cellular clean-up in full swing",
      "Strong immune-cell turnover signal",
      "Mental clarity plateau most people report on day two",
    ],
  },
  {
    id: "ext72",
    label: "72 hour fast",
    shortLabel: "72h",
    prepareHours: 24,
    fastHours: 72,
    refeedHours: 24,
    level: "Elite",
    description:
      "Three days. Electrolytes are non-negotiable and the refeed matters as much as the fast.",
    benefits: [
      "Deepest autophagy and stem-cell renewal signal",
      "Full metabolic reset for stubborn plateaus",
      "Requires a full 24h staged refeed afterwards",
    ],
  },
];

export interface ExtendedPhase {
  id: ExtendedPhaseId;
  label: string;
  hours: number;
  start: Date;
  end: Date;
  /** Tailwind-safe token colour used for dots and ring segments. */
  color: string;
  guidance: string[];
}

export function buildExtendedFastPlan(
  preset: ExtendedFastPreset,
  startAt: Date = new Date(),
): { phases: ExtendedPhase[]; endsAt: Date; totalHours: number } {
  const add = (d: Date, h: number) => new Date(d.getTime() + h * 3_600_000);

  const prepareStart = startAt;
  const prepareEnd = add(prepareStart, preset.prepareHours);
  const fastEnd = add(prepareEnd, preset.fastHours);
  const refeedEnd = add(fastEnd, preset.refeedHours);

  const phases: ExtendedPhase[] = [
    {
      id: "prepare",
      label: "Preparing",
      hours: preset.prepareHours,
      start: prepareStart,
      end: prepareEnd,
      color: "hsl(38 92% 55%)",
      guidance: [
        "Taper carbs — protein, healthy fat and vegetables only",
        "Salt your last meal and drink to thirst",
        "Start electrolytes now: sodium, potassium, magnesium",
        "Aim for a full night of sleep before the fast begins",
      ],
    },
    {
      id: "fast",
      label: "Fasting",
      hours: preset.fastHours,
      start: prepareEnd,
      end: fastEnd,
      color: "hsl(var(--primary))",
      guidance: [
        "Water, black coffee, plain tea and electrolytes only",
        "Keep training light — walks over heavy lifts",
        "Dizzy or heart racing? Take salt, then break the fast",
        "Expect a dip around hour 18 — it passes",
      ],
    },
    {
      id: "refeed",
      label: "Refeeding",
      hours: preset.refeedHours,
      start: fastEnd,
      end: refeedEnd,
      color: "hsl(210 90% 60%)",
      guidance: [
        "Break with bone broth or a small piece of soft fruit",
        "Wait 45 minutes, then eat a light protein + vegetable meal",
        "No big carb or fried-food meal for the first 6 hours",
        "Keep electrolytes going through the whole refeed",
      ],
    },
  ];

  return {
    phases,
    endsAt: refeedEnd,
    totalHours: preset.prepareHours + preset.fastHours + preset.refeedHours,
  };
}

export function formatPhaseMoment(d: Date, now: Date = new Date()): string {
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const isTomorrow =
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate();

  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today at ${time}`;
  if (isTomorrow) return `Tomorrow at ${time}`;
  return `${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} at ${time}`;
}

export function formatDurationLabel(hours: number): string {
  if (hours < 24) return `${hours} Hours`;
  const days = hours / 24;
  const rounded = Math.round(days * 10) / 10;
  return `${rounded} ${rounded === 1 ? "Day" : "Days"}`;
}