import { ClientLayout } from "@/components/ClientLayout";
import { InteractiveProtocolCardDemo, type DemoProtocol } from "@/components/plan/InteractiveProtocolCardDemo";
import { CATEGORY_CONFIG } from "@/lib/fastingCategoryConfig";
import { getProtocolCardContent } from "@/lib/protocolCardContent";
import { TreePine } from "lucide-react";

// Reference protocol: "Level 5 — 72h / 3 Days" (matches the user screenshot)
const loseWeight = CATEGORY_CONFIG["LOSE WEIGHT"];
const energy = CATEGORY_CONFIG["BOOST ENERGY"];
const focus = CATEGORY_CONFIG["SHARPEN FOCUS"];

const referenceProtocol: DemoProtocol = {
  id: "ref-72",
  icon: TreePine,
  accentColorClass: "text-blue-600",
  iconGradient: "from-blue-500 via-indigo-500 to-purple-600",
  surfaceTintGradient: "from-blue-500/10 via-transparent to-indigo-500/10",
  eyebrow: "LEVEL 5",
  subEyebrow: "Pushing boundaries",
  title: "72h",
  titleSuffix: " — 3 Days",
  stats: [
    { value: "72h", label: "Fast", accentClass: "text-blue-600" },
    { value: "∞", label: "Duration" },
    { value: "Expert", label: "Level" },
  ],
  status: null,
  content: getProtocolCardContent(72, true),
};

const protocolsForSwipe: DemoProtocol[] = [
  referenceProtocol,
  {
    id: "lose-48",
    icon: loseWeight.icon,
    accentColorClass: loseWeight.color,
    iconGradient: loseWeight.iconGradient,
    surfaceTintGradient: loseWeight.surfaceTintGradient,
    eyebrow: "LOSE WEIGHT",
    subEyebrow: "Adaptive Protocol",
    title: "48h",
    titleSuffix: " — 2 Days",
    stats: [
      { value: "48h", label: "Fast", accentClass: loseWeight.color },
      { value: "2 weeks", label: "Duration" },
      { value: "Advanced", label: "Level" },
    ],
    status: "current",
    content: getProtocolCardContent(48, false),
  },
  {
    id: "energy-24",
    icon: energy.icon,
    accentColorClass: energy.color,
    iconGradient: energy.iconGradient,
    surfaceTintGradient: energy.surfaceTintGradient,
    eyebrow: "BOOST ENERGY",
    subEyebrow: "Daily Reset",
    title: "24h",
    titleSuffix: " — 1 Day",
    stats: [
      { value: "24h", label: "Fast", accentClass: energy.color },
      { value: "Ongoing", label: "Duration" },
      { value: "Intermediate", label: "Level" },
    ],
    status: null,
    content: getProtocolCardContent(24, false),
  },
  {
    id: "focus-18",
    icon: focus.icon,
    accentColorClass: focus.color,
    iconGradient: focus.iconGradient,
    surfaceTintGradient: focus.surfaceTintGradient,
    eyebrow: "SHARPEN FOCUS",
    subEyebrow: "Cognitive Mode",
    title: "18h",
    titleSuffix: " — 6h Window",
    stats: [
      { value: "18h", label: "Fast", accentClass: focus.color },
      { value: "Daily", label: "Duration" },
      { value: "Beginner", label: "Level" },
    ],
    status: null,
    content: getProtocolCardContent(18, false),
  },
];

function VariantSection({
  num,
  title,
  description,
  children,
}: {
  num: number;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-black">
          {num}
        </span>
        <div>
          <h2 className="text-base font-extrabold leading-tight">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function ClientProtocolCardDemo() {
  return (
    <ClientLayout>
      <div className="max-w-md mx-auto px-4 py-6 space-y-8 pb-32">
        <header className="space-y-1.5">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
            Interaction Preview
          </span>
          <h1 className="text-2xl font-black leading-tight">Protocol Card · 4 styles</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Same card, four interactions. Tap each to feel the difference, then tell me which one to ship.
          </p>
        </header>

        <VariantSection
          num={1}
          title="Tap to flip"
          description="3D rotation reveals timeline + benefits + coach notes on the back."
        >
          <InteractiveProtocolCardDemo variant="flip" protocol={referenceProtocol} />
        </VariantSection>

        <VariantSection
          num={2}
          title="Tap to expand"
          description="Card stays in place and accordions open inline with the same details."
        >
          <InteractiveProtocolCardDemo variant="expand" protocol={referenceProtocol} />
        </VariantSection>

        <VariantSection
          num={3}
          title="Tilt + press depth"
          description="Move your finger across the card to feel the 3D parallax. Press to sink it in."
        >
          <InteractiveProtocolCardDemo variant="tilt" protocol={referenceProtocol} />
        </VariantSection>

        <VariantSection
          num={4}
          title="Swipe between protocols"
          description="Swipe left/right (or tap arrows) to flip through plans without leaving the card."
        >
          <InteractiveProtocolCardDemo variant="swipe" protocol={referenceProtocol} protocols={protocolsForSwipe} />
        </VariantSection>

        <VariantSection
          num={5}
          title="Combo: Swipe + Flip (recommended)"
          description="Swipe left/right to browse protocols. Tap the card to flip and reveal all 7 sections of real coaching detail."
        >
          <InteractiveProtocolCardDemo variant="combo" protocol={referenceProtocol} protocols={protocolsForSwipe} />
        </VariantSection>

        <div className="pt-6 border-t border-border space-y-2">
          <h2 className="text-lg font-black leading-tight">Front-face fillers · 5 ideas</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Same combo card, different ways to fill the empty space below the stat tiles. Swipe + tap each one to feel it.
          </p>
        </div>

        <VariantSection
          num={6}
          title="A · Phase timeline + Feel chips (recommended)"
          description="Combines the two top picks: a 3–4 dot journey timeline + a strip showing what the client will feel."
        >
          <InteractiveProtocolCardDemo
            variant="combo"
            protocol={referenceProtocol}
            protocols={protocolsForSwipe}
            frontExtra="timelineAndChips"
          />
        </VariantSection>

        <VariantSection
          num={7}
          title="B · Mini phase timeline only"
          description="A compact horizontal timeline of body phases (Glycogen → Fat-burning → Autophagy)."
        >
          <InteractiveProtocolCardDemo
            variant="combo"
            protocol={referenceProtocol}
            protocols={protocolsForSwipe}
            frontExtra="timeline"
          />
        </VariantSection>

        <VariantSection
          num={8}
          title="C · 'What you'll feel' chips only"
          description="Three icon chips teasing the top benefits — fat burn, energy, clarity."
        >
          <InteractiveProtocolCardDemo
            variant="combo"
            protocol={referenceProtocol}
            protocols={protocolsForSwipe}
            frontExtra="feelChips"
          />
        </VariantSection>

        <VariantSection
          num={9}
          title="D · Live progress ring (active protocol only)"
          description="Big ring showing how far into the fast they are, with the next milestone called out."
        >
          <InteractiveProtocolCardDemo
            variant="combo"
            protocol={referenceProtocol}
            protocols={protocolsForSwipe}
            frontExtra="progressRing"
          />
        </VariantSection>

        <VariantSection
          num={10}
          title="E · Coach quote"
          description="One short italic line of personality + social proof from Coach K."
        >
          <InteractiveProtocolCardDemo
            variant="combo"
            protocol={referenceProtocol}
            protocols={protocolsForSwipe}
            frontExtra="coachQuote"
          />
        </VariantSection>

        <VariantSection
          num={11}
          title="F · Difficulty + readiness meter"
          description="5-dot intensity scale plus a 'recommended for you' badge based on tier."
        >
          <InteractiveProtocolCardDemo
            variant="combo"
            protocol={referenceProtocol}
            protocols={protocolsForSwipe}
            frontExtra="difficulty"
          />
        </VariantSection>

        <p className="text-center text-xs text-muted-foreground pt-4">
          All variants use count-up stat tiles, icon pulse + glow, and shimmer on hover.
        </p>
      </div>
    </ClientLayout>
  );
}