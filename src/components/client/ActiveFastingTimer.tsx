import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Lock, BookOpen, ChevronDown, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentStage, FASTING_STAGES } from "@/lib/fastingStages";
import { format } from "date-fns";
import fastingTimerBg from "@/assets/fasting-timer-bg.png";

interface ActiveFastingTimerProps {
  protocolName: string;
  isCoachAssigned?: boolean;
  startedAt: string;
  targetHours: number;
  backgroundImageUrl?: string | null;
  lockPin?: string | null;
  onEndFast: () => void;
  dayNumber?: number;
  totalDays?: number;
  ketoTypeName?: string | null;
  ketoTypeAbbreviation?: string | null;
  ketoTypeColor?: string | null;
}

const SIZE = 320;
const STROKE = 38;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${days[d.getDay()]}, ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

export function ActiveFastingTimer({
  protocolName,
  isCoachAssigned = true,
  startedAt,
  targetHours,
  backgroundImageUrl,
  lockPin,
  onEndFast,
  dayNumber = 1,
  totalDays,
}: ActiveFastingTimerProps) {
  const [now, setNow] = useState(Date.now());
  const [showStages, setShowStages] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [showPinDialog, setShowPinDialog] = useState(false);

  const startTime = new Date(startedAt).getTime();
  const totalMs = targetHours * 3_600_000;
  const elapsedMs = now - startTime;
  const remainingMs = Math.max(0, totalMs - elapsedMs);
  const progress = Math.min(elapsedMs / totalMs, 1);
  const elapsedHours = (elapsedMs / 3_600_000);
  const stage = getCurrentStage(elapsedHours);
  const percentElapsed = Math.round(progress * 100);
  const goalTime = startTime + totalMs;

  // Live tick
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Multi-colored arc segments
  const arcSegments = useMemo(() => {
    const relevant = FASTING_STAGES.filter((s) => s.minHours < targetHours);
    const segments: { startFraction: number; endFraction: number; color: string }[] = [];
    for (let i = 0; i < relevant.length; i++) {
      const stageStart = relevant[i].minHours / targetHours;
      const stageEnd = i + 1 < relevant.length
        ? Math.min(relevant[i + 1].minHours / targetHours, 1)
        : 1;
      if (progress <= stageStart) break;
      const clippedEnd = Math.min(stageEnd, progress);
      segments.push({ startFraction: stageStart, endFraction: clippedEnd, color: relevant[i].dotColor });
    }
    return segments;
  }, [targetHours, progress]);

  // Stage markers on ring
  const stageMarkers = useMemo(() => {
    return FASTING_STAGES
      .filter((s) => s.minHours <= targetHours && s.minHours < targetHours)
      .map((s) => ({
        ...s,
        fraction: s.minHours / targetHours,
        reached: elapsedHours >= s.minHours,
      }));
  }, [targetHours, elapsedHours]);

  // Hold to end
  const [holding, setHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef(0);

  const startHold = useCallback(() => {
    if (lockPin) {
      setShowPinDialog(true);
      return;
    }
    setHolding(true);
    holdStartRef.current = Date.now();
    holdRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      const p = Math.min(elapsed / 2000, 1);
      setHoldProgress(p);
      if (p >= 1) {
        if (holdRef.current) clearInterval(holdRef.current);
        setHolding(false);
        setHoldProgress(0);
        onEndFast();
      }
    }, 50);
  }, [lockPin, onEndFast]);

  const endHold = useCallback(() => {
    if (holdRef.current) clearInterval(holdRef.current);
    setHolding(false);
    setHoldProgress(0);
  }, []);

  return (
    <div className="relative w-full min-h-[85vh] flex flex-col overflow-hidden rounded-none">
      {/* Background */}
      <div className="absolute inset-0 bg-black">
        <img
          src={fastingTimerBg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
      <div className="absolute inset-0 bg-black/45" />

      {/* Content */}
      <div className="relative z-10 flex flex-col flex-1 px-5 pt-5 pb-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
                Fasting Protocol
              </p>
              {lockPin && (
                <Badge className="bg-white/10 text-white/70 border-0 text-[10px] font-semibold px-2 py-0.5 gap-1">
                  <Lock className="h-3 w-3" />
                  Locked
                </Badge>
              )}
            </div>
            <h3 className="text-xl font-bold text-white">{protocolName}</h3>
          </div>
          <p className="text-sm font-semibold text-white/60">
            Day {dayNumber}{totalDays ? ` / ${totalDays}` : ""}
          </p>
        </div>

        {/* Ring */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative" style={{ width: SIZE, height: SIZE }}>
            <svg width={SIZE} height={SIZE} className="transform -rotate-90">
              {/* Background ring */}
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={STROKE}
              />
              {/* Outer thin ring */}
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS + 22}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={1}
              />
              {/* Multi-colored arc segments */}
              {arcSegments.map((seg, i) => {
                const segLength = (seg.endFraction - seg.startFraction) * CIRCUMFERENCE;
                const segOffset = seg.startFraction * CIRCUMFERENCE;
                return (
                  <circle
                    key={i}
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={STROKE}
                    strokeDasharray={`${segLength} ${CIRCUMFERENCE - segLength}`}
                    strokeDashoffset={-segOffset}
                    strokeLinecap="butt"
                    className="transition-all duration-500"
                  />
                );
              })}
            </svg>

            {/* Stage marker dots on the ring */}
            {stageMarkers.map((marker) => {
              const angle = marker.fraction * 360 - 90;
              const rad = (angle * Math.PI) / 180;
              const x = SIZE / 2 + RADIUS * Math.cos(rad);
              const y = SIZE / 2 + RADIUS * Math.sin(rad);
              return (
                <motion.div
                  key={marker.id}
                  className="absolute"
                  style={{
                    left: x - 6,
                    top: y - 6,
                    width: 12,
                    height: 12,
                  }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                >
                  <div
                    className={`w-3 h-3 rounded-full border-2 ${
                      marker.reached ? "border-white shadow-lg" : "border-white/30"
                    }`}
                    style={{
                      backgroundColor: marker.reached ? marker.dotColor : "transparent",
                      boxShadow: marker.reached ? `0 0 8px ${marker.dotColor}60` : "none",
                    }}
                  />
                </motion.div>
              );
            })}

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
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
              <p className="text-[3.2rem] font-bold text-white tabular-nums leading-none mt-1 tracking-tight">
                {formatTime(remainingMs)}
              </p>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/60 mt-1">
                Elapsed ({percentElapsed}%)
              </p>
            </div>
          </div>
        </div>

        {/* Started / Goal info cards */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="rounded-xl border border-white/20 px-4 py-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">
              Started
            </p>
            <p className="text-sm font-bold text-white mt-0.5">
              {formatDateTime(startTime)}
            </p>
          </div>
          <div className="rounded-xl border border-white/20 px-4 py-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">
              {targetHours}h Goal
            </p>
            <p className="text-sm font-bold text-white mt-0.5">
              {formatDateTime(goalTime)}
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
            onMouseUp={endHold}
            onMouseLeave={endHold}
            onTouchStart={startHold}
            onTouchEnd={endHold}
          >
            <Lock className="h-4 w-4" />
            Hold to End Fast Early
          </Button>
          {holdProgress > 0 && (
            <div
              className="absolute bottom-0 left-0 h-1 bg-red-500 rounded-full transition-all"
              style={{ width: `${holdProgress * 100}%` }}
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
          <motion.div
            className="mt-3 space-y-2"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
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
          </motion.div>
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
