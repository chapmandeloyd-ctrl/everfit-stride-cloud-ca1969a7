import { ClientLayout } from "@/components/ClientLayout";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Leaf, Flame, HeartPulse, Target, ChevronRight } from "lucide-react";
import lionLogo from "@/assets/logo.png";

/**
 * ClientBeginReset — Editorial Black & Gold plan picker.
 *
 * Replaces the legacy /client/choose-protocol kitchen-sink page with a
 * focused, high-end "Choose Your Focus" step rendered in the same theme
 * as the StartHere "Begin Your Reset" card (gold-on-black, serif headline,
 * faint lion watermark, gold outlined cards).
 *
 * Selecting a focus drops the user into the existing protocol selection
 * (/client/choose-protocol) with the focus pre-applied via query string,
 * so we keep all the legacy plan logic working underneath.
 */

const GOLD = "hsl(42 70% 55%)";
const IVORY = "hsl(40 20% 92%)";
const MUTED = "hsl(40 10% 65%)";
const BG = "hsl(0 0% 4%)";

interface FocusOption {
  id: string;
  label: string;
  subtitle: string;
  range: string;
  icon: React.ElementType;
}

const FOCUS_OPTIONS: FocusOption[] = [
  {
    id: "balanced",
    label: "Balanced Lifestyle",
    subtitle: "Structure without extreme restriction.",
    range: "12:12 — 16:8",
    icon: Leaf,
  },
  {
    id: "transformation",
    label: "Body Transformation",
    subtitle: "Visible fat loss and stronger metabolic change.",
    range: "16:8 — 20:4",
    icon: Flame,
  },
  {
    id: "longevity",
    label: "Longevity & Metabolic Health",
    subtitle: "Deeper cellular and metabolic support.",
    range: "18:6 — 24 Hour",
    icon: HeartPulse,
  },
  {
    id: "advanced",
    label: "Advanced Discipline",
    subtitle: "Experienced and comfortable with extended fasting.",
    range: "20:4 — 23:1 + Extended",
    icon: Target,
  },
];

export default function ClientBeginReset() {
  const navigate = useNavigate();

  const handleSelect = (id: string) => {
    // Forward to the legacy protocol selection so all real plan logic still applies
    navigate(`/client/choose-protocol?focus=${id}`);
  };

  return (
    <ClientLayout>
      <div
        className="relative min-h-screen overflow-hidden"
        style={{ background: BG }}
      >
        {/* Faint gold lion watermark */}
        <img
          src={lionLogo}
          alt=""
          aria-hidden
          className="absolute inset-0 m-auto w-[120%] h-[120%] object-contain pointer-events-none"
          style={{
            filter: "sepia(1) hue-rotate(-15deg) saturate(2.5) brightness(1.2)",
            opacity: 0.06,
          }}
        />

        <div className="relative px-6 pt-6 pb-32">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <button
              type="button"
              onClick={() => navigate("/client/dashboard")}
              className="p-2 -ml-2 rounded-full transition active:scale-95"
              style={{ color: IVORY }}
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </div>

          {/* Editorial intro */}
          <div className="text-center mb-10">
            <img
              src={lionLogo}
              alt=""
              aria-hidden
              className="mx-auto w-12 h-12 object-contain mb-4 opacity-90"
              style={{
                filter: "sepia(1) hue-rotate(-15deg) saturate(2) brightness(1.1)",
              }}
            />
            <div
              className="mx-auto w-12 h-px mb-6"
              style={{ background: GOLD }}
            />
            <p
              className="text-[10px] uppercase tracking-[0.4em] mb-3"
              style={{ color: GOLD }}
            >
              The Protocol
            </p>
            <h1
              className="text-3xl font-light tracking-tight mb-3"
              style={{ color: IVORY, fontFamily: "Georgia, serif" }}
            >
              Choose Your Focus
            </h1>
            <p
              className="text-sm max-w-xs mx-auto leading-relaxed"
              style={{ color: MUTED }}
            >
              Your fasting structure should match your current goal — not your ego.
            </p>
          </div>

          {/* Plan cards */}
          <div className="space-y-3">
            {FOCUS_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelect(opt.id)}
                  className="w-full text-left transition active:scale-[0.99]"
                  style={{
                    background: "transparent",
                    border: "1px solid hsl(42 70% 55% / 0.35)",
                    borderRadius: "2px",
                  }}
                >
                  <div className="px-5 py-5 flex items-center gap-4">
                    <div
                      className="h-11 w-11 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        border: "1px solid hsl(42 70% 55% / 0.5)",
                        background: "hsl(42 70% 55% / 0.05)",
                      }}
                    >
                      <Icon className="h-5 w-5" style={{ color: GOLD }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3
                        className="text-base font-medium leading-tight"
                        style={{
                          color: IVORY,
                          fontFamily: "Georgia, serif",
                        }}
                      >
                        {opt.label}
                      </h3>
                      <p
                        className="text-xs mt-1 leading-snug"
                        style={{ color: MUTED }}
                      >
                        {opt.subtitle}
                      </p>
                      <p
                        className="text-[10px] uppercase tracking-[0.25em] mt-2"
                        style={{ color: GOLD }}
                      >
                        {opt.range}
                      </p>
                    </div>
                    <ChevronRight
                      className="h-4 w-4 shrink-0"
                      style={{ color: GOLD }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Editorial closer */}
          <div className="mt-10 text-center">
            <div
              className="mx-auto w-12 h-px mb-5"
              style={{ background: GOLD, opacity: 0.6 }}
            />
            <p
              className="text-xs italic max-w-xs mx-auto leading-relaxed"
              style={{ color: MUTED, fontFamily: "Georgia, serif" }}
            >
              Choose the level that supports your life — not one that disrupts it.
              <br />
              <span style={{ color: IVORY }}>
                Intensity without recovery is regression.
              </span>
            </p>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}