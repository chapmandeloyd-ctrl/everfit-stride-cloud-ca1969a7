import { useState, useEffect, useRef, useCallback } from "react";
import { Lock, Plus, BookOpen, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentStage, FASTING_STAGES } from "@/lib/fastingStages";
import { format } from "date-fns";

interface ActiveFastingTimerProps {
  protocolName: string;
  isCoachAssigned?: boolean;
  startedAt: string;               // ISO timestamp
  targetHours: number;
  backgroundImageUrl?: string | null;
  lockPin?: string | null;
  onEndFast: () => void;
}

export function ActiveFastingTimer({
  protocolName,
  isCoachAssigned = true,
  startedAt,
  targetHours,
  backgroundImageUrl,
  lockPin,
  onEndFast,
}: ActiveFastingTimerProps) {
  const [elapsed, setElapsed] = useState(0); // seconds
  const [showStages, setShowStages] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [showPinDialog, setShowPinDialog] = useState(false);

  // Live timer
  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const elapsedHours = elapsed / 3600;
  const totalTargetSeconds = targetHours * 3600;
  const progress = Math.min(elapsed / totalTargetSeconds, 1);
  const stage = getCurrentStage(elapsedHours);

  // Format elapsed time
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const startDate = new Date(startedAt);
  const goalDate = new Date(startDate.getTime() + targetHours * 3600 * 1000);

  // Hold to end
  const startHold = useCallback(() => {
    if (lockPin) {
      setShowPinDialog(true);
      return;
    }
    setHoldProgress(0);
    holdTimerRef.current = setInterval(() => {
      setHoldProgress((prev) => {
        if (prev >= 100) {
          if (holdTimerRef.current) clearInterval(holdTimerRef.current);
          onEndFast();
          return 100;
        }
        return prev + 5;
      });
    }, 100);
  }, [lockPin, onEndFast]);

  const cancelHold = useCallback(() => {
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    setHoldProgress(0);
  }, []);

  // SVG ring
  const ringSize = 280;
  const strokeWidth = 4;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  // Dot positions on the ring (start at top = -90deg)
  const startAngle = -90;
  const progressAngle = startAngle + progress * 360;
  const dotOnCircle = (angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    const cx = ringSize / 2 + radius * Math.cos(rad);
    const cy = ringSize / 2 + radius * Math.sin(rad);
    return { cx, cy };
  };

  const startDot = dotOnCircle(startAngle);
  const progressDot = dotOnCircle(progressAngle);

  return (
    <div className="relative w-full min-h-[85vh] flex flex-col overflow-hidden rounded-none">
      {/* Background */}
      {backgroundImageUrl ? (
        <img
          src={backgroundImageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-black" />
      )}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content */}
      <div className="relative z-10 flex flex-col flex-1 px-5 pt-5 pb-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
              Fasting Protocol
            </p>
            {isCoachAssigned && (
              <Badge className="bg-red-500/20 text-red-400 border-0 text-[10px] font-semibold px-2 py-0.5">
                Coach Assigned
              </Badge>
            )}
          </div>
          <h3 className="text-xl font-bold text-white">{protocolName}</h3>
        </div>

        {/* Timer Ring */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative" style={{ width: ringSize, height: ringSize }}>
            <svg width={ringSize} height={ringSize} className="transform -rotate-90">
              {/* Background ring */}
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={strokeWidth}
              />
              {/* Progress arc */}
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                fill="none"
                stroke={stage.dotColor}
                strokeWidth={strokeWidth + 2}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>

            {/* Start dot */}
            <div
              className="absolute w-5 h-5 rounded-full border-2 border-white/80 shadow-lg"
              style={{
                left: startDot.cx - 10,
                top: startDot.cy - 10,
                backgroundColor: stage.dotColor,
                transform: "rotate(0deg)",
              }}
            />

            {/* Progress dot */}
            <div
              className="absolute w-5 h-5 rounded-full border-2 shadow-lg transition-all duration-1000"
              style={{
                left: progressDot.cx - 10,
                top: progressDot.cy - 10,
                backgroundColor: stage.dotColor,
                borderColor: stage.dotColor,
                boxShadow: `0 0 12px ${stage.dotColor}60`,
              }}
            />

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {/* Stage dot */}
              <div
                className="w-4 h-4 rounded-full mb-2"
                style={{ backgroundColor: stage.dotColor }}
              />
              <p
                className="text-xs font-bold uppercase tracking-[0.2em]"
                style={{ color: stage.dotColor }}
              >
                {stage.label}
              </p>
              {/* Big timer */}
              <p className="text-[3.2rem] font-bold text-white tabular-nums leading-none mt-1 tracking-tight">
                {timeStr}
              </p>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/60 mt-1">
                Elapsed ({Math.round(progress * 100)}%)
              </p>
            </div>

            {/* Decorative dots around ring */}
            {FASTING_STAGES.map((s) => {
              const stageAngle = startAngle + (s.minHours / targetHours) * 360;
              if (s.minHours > targetHours) return null;
              const pos = dotOnCircle(stageAngle);
              return (
                <div
                  key={s.id}
                  className="absolute w-2.5 h-2.5 rounded-full opacity-40"
                  style={{
                    left: pos.cx - 5,
                    top: pos.cy - 5,
                    backgroundColor: s.dotColor,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Started / Goal */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="rounded-xl border border-white/20 px-4 py-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">
              Started
            </p>
            <p className="text-sm font-bold text-white mt-0.5">
              {format(startDate, "EEE, h:mm a")}
            </p>
          </div>
          <div className="rounded-xl border border-white/20 px-4 py-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">
              {targetHours}H Goal
            </p>
            <p className="text-sm font-bold text-white mt-0.5">
              {format(goalDate, "EEE, h:mm a")}
            </p>
          </div>
        </div>

        {/* Stage description */}
        <p className="text-sm text-white/60 text-center mt-3">{stage.description}</p>

        {/* Hold to End */}
        <div className="mt-4 relative">
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl border-red-500/40 bg-red-500/10 text-red-400 font-semibold text-base gap-2 hover:bg-red-500/20 active:scale-[0.98] transition-transform"
            onMouseDown={startHold}
            onMouseUp={cancelHold}
            onMouseLeave={cancelHold}
            onTouchStart={startHold}
            onTouchEnd={cancelHold}
          >
            <Lock className="h-4 w-4" />
            Hold to End Fast Early
          </Button>
          {holdProgress > 0 && (
            <div
              className="absolute bottom-0 left-0 h-1 bg-red-500 rounded-full transition-all"
              style={{ width: `${holdProgress}%` }}
            />
          )}
        </div>

        {/* Learn About Stages */}
        <button
          onClick={() => setShowStages(!showStages)}
          className="flex items-center justify-center gap-2 mt-4 text-sm font-semibold text-red-400 mx-auto active:scale-95 transition-transform"
        >
          <BookOpen className="h-4 w-4" />
          Learn About Fasting Stages
          <ChevronDown className={`h-4 w-4 transition-transform ${showStages ? "rotate-180" : ""}`} />
        </button>

        {showStages && (
          <div className="mt-3 space-y-2 animate-in slide-in-from-top-2">
            {FASTING_STAGES.map((s) => (
              <div
                key={s.id}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                  s.id === stage.id ? "bg-white/10 ring-1 ring-white/20" : "bg-white/5"
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: s.dotColor }}
                />
                <div>
                  <p className="text-xs font-bold text-white">{s.label}</p>
                  <p className="text-[11px] text-white/50">
                    {s.minHours}h+ — {s.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button className="fixed bottom-24 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30 transition-transform hover:scale-105 active:scale-95">
        <Plus className="h-6 w-6" />
      </button>

      {/* PIN Dialog */}
      {showPinDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-card rounded-2xl p-6 w-72 space-y-4">
            <h3 className="text-lg font-bold text-center">Enter PIN to End Fast</h3>
            <input
              type="password"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full text-center text-2xl tracking-[0.3em] rounded-xl border border-border bg-background p-3 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowPinDialog(false);
                  setPinInput("");
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  if (pinInput === lockPin) {
                    setShowPinDialog(false);
                    setPinInput("");
                    onEndFast();
                  }
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
