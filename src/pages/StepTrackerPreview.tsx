import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Footprints, Star, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Preview-only page: shows two style options for the daily Step Tracker card
 * (read-only — data will come from Apple Health AI snapshot).
 * Visit /preview/step-tracker
 */

const STEPS = 6420;
const GOAL = 10000;
const PROGRESS = Math.min(STEPS / GOAL, 1);
const PERCENT = Math.round(PROGRESS * 100);

const MARKERS = Array.from({ length: 8 }, (_, i) => i);

function MotivationLine() {
  return (
    <div className="text-center space-y-1 pt-1">
      <div className="text-base font-semibold text-foreground">
        You're on the move — keep stepping!
      </div>
      <div className="text-xs text-muted-foreground">
        {(GOAL - STEPS).toLocaleString()} steps to close today's ring.
      </div>
    </div>
  );
}

function CardShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden border-border/60 bg-card">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            {title}
          </span>
          <div className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground">
            <Settings className="h-[22px] w-[22px]" strokeWidth={1.75} />
          </div>
        </div>

        {/* Numeric readout */}
        <div className="text-2xl font-bold text-foreground">
          {STEPS.toLocaleString()}
          <span className="text-muted-foreground font-medium">
            /{GOAL.toLocaleString()} steps
          </span>
        </div>

        {children}

        <MotivationLine />

        <div className="text-[10px] uppercase tracking-wide text-muted-foreground/60 text-center">
          Synced from Apple Health
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressBar({ icon }: { icon: React.ReactNode }) {
  return (
    <div className="relative h-14">
      {/* Track */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 rounded-full bg-secondary/60 overflow-hidden">
        {/* Markers behind fill */}
        <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none z-0">
          {MARKERS.map((i) => {
            const isLast = i === MARKERS.length - 1;
            if (isLast) {
              return (
                <Star
                  key={i}
                  className="h-5 w-5 text-amber-400 fill-amber-400/80"
                />
              );
            }
            return (
              <Footprints
                key={i}
                className="h-4 w-4 text-emerald-300/60 fill-emerald-300/30"
              />
            );
          })}
        </div>

        {/* Fill */}
        <div
          className="relative h-full rounded-full bg-gradient-to-r from-emerald-500/85 to-emerald-400/90 transition-all duration-700 ease-out flex items-center px-3 z-10"
          style={{ width: `${Math.max(PERCENT, 6)}%` }}
        >
          {PERCENT > 0 && (
            <span className="text-xs font-semibold text-white drop-shadow">
              {PERCENT}%
            </span>
          )}
        </div>
      </div>

      {/* Sliding icon */}
      <div
        className="absolute top-1/2 pointer-events-none select-none"
        style={{
          left: `${Math.max(PERCENT, 4)}%`,
          transform: "translate(-50%, -50%)",
          transition: "left 700ms ease-out",
        }}
        aria-hidden="true"
      >
        {icon}
      </div>
    </div>
  );
}

/* ---------- Option A: Sneaker ---------- */
function SneakerIcon() {
  return (
    <div className="drop-shadow-lg">
      <svg width="56" height="44" viewBox="0 0 56 44">
        <defs>
          <linearGradient id="sneakerBody" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(150 70% 55%)" />
            <stop offset="100%" stopColor="hsl(150 75% 38%)" />
          </linearGradient>
        </defs>
        {/* Sole */}
        <path
          d="M3 32 Q3 38 9 38 H49 Q53 38 53 34 L52 30 H4 Z"
          fill="hsl(0 0% 100% / 0.95)"
          stroke="hsl(150 30% 25%)"
          strokeWidth="1.2"
        />
        {/* Body */}
        <path
          d="M5 30 L5 22 Q5 16 12 14 L22 12 Q26 11 28 14 L32 19 Q34 21 38 21 L46 22 Q52 23 52 28 L52 30 Z"
          fill="url(#sneakerBody)"
          stroke="hsl(150 30% 20%)"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Laces */}
        <path
          d="M14 22 L20 18 M18 24 L24 20 M22 26 L28 22"
          stroke="hsl(0 0% 100% / 0.9)"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        {/* Swoosh */}
        <path
          d="M30 28 Q38 22 48 24"
          stroke="hsl(0 0% 100%)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

/* ---------- Option B: Footprint pair (alternates) ---------- */
function FootprintPairIcon({ flip }: { flip: boolean }) {
  return (
    <div
      className={cn(
        "drop-shadow-lg transition-transform duration-300",
        flip ? "scale-x-[-1]" : ""
      )}
    >
      <svg width="48" height="52" viewBox="0 0 48 52">
        <defs>
          <linearGradient id="footGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(150 75% 60%)" />
            <stop offset="100%" stopColor="hsl(150 80% 40%)" />
          </linearGradient>
        </defs>
        {/* Back foot (faded) */}
        <g opacity="0.45" transform="translate(2 28)">
          <ellipse cx="10" cy="12" rx="7" ry="9" fill="url(#footGrad)" />
          <circle cx="5" cy="3" r="2" fill="url(#footGrad)" />
          <circle cx="9" cy="1" r="2.2" fill="url(#footGrad)" />
          <circle cx="13" cy="2" r="2" fill="url(#footGrad)" />
          <circle cx="16" cy="4" r="1.8" fill="url(#footGrad)" />
          <circle cx="18" cy="7" r="1.5" fill="url(#footGrad)" />
        </g>
        {/* Front foot */}
        <g transform="translate(22 6)">
          <ellipse
            cx="10"
            cy="14"
            rx="8"
            ry="11"
            fill="url(#footGrad)"
            stroke="hsl(150 50% 25%)"
            strokeWidth="1"
          />
          <circle cx="4" cy="3" r="2.4" fill="url(#footGrad)" />
          <circle cx="9" cy="0.5" r="2.6" fill="url(#footGrad)" />
          <circle cx="14" cy="1.5" r="2.4" fill="url(#footGrad)" />
          <circle cx="17.5" cy="4" r="2" fill="url(#footGrad)" />
          <circle cx="19.5" cy="7.5" r="1.8" fill="url(#footGrad)" />
        </g>
      </svg>
    </div>
  );
}

export default function StepTrackerPreview() {
  const [flip, setFlip] = useState(false);

  return (
    <div className="min-h-screen bg-background p-4 space-y-6 pb-24">
      <div className="max-w-md mx-auto space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Step Tracker — pick a style
        </h1>
        <p className="text-sm text-muted-foreground">
          Both cards mirror the Water Tracker animation (sliding icon, gradient
          fill, footprint markers, milestone star). Read-only — steps come from
          your Apple Health snapshot.
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Option 2 — Sneaker
        </div>
        <CardShell title="Daily Step Goal">
          <ProgressBar icon={<SneakerIcon />} />
        </CardShell>
      </div>

      <div className="max-w-md mx-auto space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Option 3 — Footprint pair
          </div>
          <button
            onClick={() => setFlip((f) => !f)}
            className="text-[11px] text-muted-foreground hover:text-foreground underline"
          >
            tap to alternate
          </button>
        </div>
        <CardShell title="Daily Step Goal">
          <ProgressBar icon={<FootprintPairIcon flip={flip} />} />
        </CardShell>
      </div>
    </div>
  );
}