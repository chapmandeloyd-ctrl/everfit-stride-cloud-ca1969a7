import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft } from "lucide-react";
import type { AIProposal } from "@/components/client/AIPlanProposalCard";

const PATTERNS = [
  { id: "daily", label: "Every day" },
  { id: "weekdays_only", label: "Weekdays only" },
];

function hoursBetween(startHHMM: string, endHHMM: string) {
  const [sh, sm] = startHHMM.split(":").map(Number);
  const [eh, em] = endHHMM.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60;
  return Math.round((mins / 60) * 10) / 10;
}

export default function AdjustPlanPanel({
  proposal,
  onCancel,
  onSave,
  loading,
}: {
  proposal: AIProposal;
  onCancel: () => void;
  onSave: (p: AIProposal) => void;
  loading?: boolean;
}) {
  const [start, setStart] = useState(proposal.window_start_time.slice(0, 5));
  const [end, setEnd] = useState(proposal.window_end_time.slice(0, 5));
  const [days, setDays] = useState(proposal.duration_days);
  const [pattern, setPattern] = useState(proposal.weekly_pattern || "daily");

  const eatHours = hoursBetween(start, end);
  const fastHours = Math.round((24 - eatHours) * 10) / 10;

  return (
    <div className="flex h-full flex-col gap-4">
      <button onClick={onCancel} className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/60">
        <ArrowLeft className="h-4 w-4" /> Back to plan
      </button>
      <div>
        <div className="text-2xl font-bold tracking-tight text-white">Adjust your plan</div>
        <div className="mt-1 text-sm text-white/60">
          Fine-tune the window. Everything else in your plan stays the same.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="text-[10px] uppercase tracking-wider text-white/50">Break-fast</div>
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="mt-1 w-full bg-transparent text-lg font-semibold text-white focus:outline-none"
          />
        </label>
        <label className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="text-[10px] uppercase tracking-wider text-white/50">Last meal</div>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="mt-1 w-full bg-transparent text-lg font-semibold text-white focus:outline-none"
          />
        </label>
      </div>

      <div className="rounded-xl border border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary)/0.06)] p-3 text-sm text-white/80">
        New ratio: <span className="font-semibold text-white">{fastHours}h fast · {eatHours}h eating window</span>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="text-[10px] uppercase tracking-wider text-white/50">Weekly pattern</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {PATTERNS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPattern(p.id)}
              className={`rounded-lg border px-3 py-2 text-sm ${
                pattern === p.id
                  ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.15)] text-white"
                  : "border-white/10 text-white/70"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-wider text-white/50">Starter length</div>
          <div className="text-sm font-semibold text-white">{days} days</div>
        </div>
        <input
          type="range"
          min={7}
          max={90}
          step={7}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="mt-3 w-full accent-[hsl(var(--primary))]"
        />
      </div>

      <div className="mt-auto space-y-2 pb-2">
        <Button
          size="lg"
          disabled={loading}
          onClick={() =>
            onSave({
              ...proposal,
              window_start_time: start,
              window_end_time: end,
              duration_days: days,
              weekly_pattern: pattern,
              eat_hours: eatHours,
              fast_hours: fastHours,
            })
          }
          className="h-14 w-full rounded-2xl text-base font-semibold"
        >
          <Check className="mr-2 h-4 w-4" /> Save &amp; activate plan
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={onCancel}
          disabled={loading}
          className="h-14 w-full rounded-2xl border-white/15 bg-white/[0.02] text-base font-medium text-white"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}