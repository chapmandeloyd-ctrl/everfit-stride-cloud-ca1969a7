import { CardStackBackdrop, CardFront, type DemoProtocol, type FrontExtraVariant } from "@/components/plan/InteractiveProtocolCardDemo";
import type { CSSProperties } from "react";

interface ProtocolCardStaticProps {
  protocol: DemoProtocol;
  dimmed?: boolean;
  frontExtra?: FrontExtraVariant;
}

/**
 * Pure-visual protocol card with ZERO pointer / click / flip logic.
 *
 * Use inside swipe carousels: the parent (e.g. ProtocolLibraryCarousel)
 * owns 100% of the gesture handling, so this card never fights the swipe.
 */
export function ProtocolCardStatic({ protocol, dimmed, frontExtra = "coachQuote" }: ProtocolCardStaticProps) {
  const surfaceStyle: CSSProperties = {
    background:
      "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)) 60%, hsl(var(--muted) / 0.6) 100%)",
    boxShadow:
      "0 24px 48px -16px hsl(0 0% 0% / 0.55), 0 12px 24px -10px hsl(0 0% 0% / 0.4), 0 4px 8px -2px hsl(0 0% 0% / 0.25), inset 0 1px 0 hsl(0 0% 100% / 0.1), inset 0 -1px 0 hsl(0 0% 0% / 0.3)",
  };

  return (
    <div
      className={`relative pt-6 pb-4 ${dimmed ? "opacity-60 grayscale-[20%]" : ""}`}
      style={{ pointerEvents: "none" }}
    >
      <CardStackBackdrop />
      <div className="relative rounded-2xl overflow-hidden border border-border" style={surfaceStyle}>
        <CardFront
          protocol={protocol}
          showChevron={false}
          pulse={false}
          shimmer={false}
          animateStats={false}
          frontExtra={frontExtra}
        />
      </div>
    </div>
  );
}