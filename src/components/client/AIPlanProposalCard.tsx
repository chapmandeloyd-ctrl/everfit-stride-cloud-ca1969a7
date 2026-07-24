import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, ChevronDown, ChevronUp, RefreshCw, Check, Settings2 } from "lucide-react";
import EatingScheduleBreakdown, { type ScheduleItem } from "./EatingScheduleBreakdown";

export interface AIProposal {
  protocol_id: string;
  protocol_name: string;
  fast_hours: number;
  eat_hours: number;
  fuel_style: string;
  window_start_time: string;
  window_end_time: string;
  duration_days: number;
  weekly_pattern: string;
  reasoning: string[];
  expectations: string[];
  schedule_breakdown: ScheduleItem[];
}

function fmt(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, "0")} ${period}`;
}

function humanize(text: string) {
  return text.replace(/\b(\d{1,2}):(\d{2})\b/g, (_, h, m) => fmt(`${h}:${m}`));
}

function Section({
  title, defaultOpen = false, children,
}: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <span className="text-sm font-semibold text-white">{title}</span>
        {open ? <ChevronUp className="h-4 w-4 text-white/50" /> : <ChevronDown className="h-4 w-4 text-white/50" />}
      </button>
      {open && <div className="border-t border-white/5 p-4">{children}</div>}
    </div>
  );
}

export default function AIPlanProposalCard({
  proposal,
  onAccept,
  onAdjust,
  onRegenerate,
  loading,
}: {
  proposal: AIProposal;
  onAccept: () => void;
  onAdjust: () => void;
  onRegenerate: () => void;
  loading?: boolean;
}) {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[hsl(var(--primary))]" />
        <div className="text-xs uppercase tracking-[0.25em] text-white/60">Your Apex360 AI plan</div>
      </div>
      <div className="rounded-2xl border border-[hsl(var(--primary)/0.3)] bg-gradient-to-b from-[hsl(var(--primary)/0.08)] to-transparent p-5">
        <div className="text-2xl font-bold tracking-tight text-white">{proposal.protocol_name}</div>
        <div className="mt-1 text-sm text-white/70">
          {proposal.fuel_style} · {proposal.duration_days}-day starter
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-black/40 p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/50">Break-fast</div>
            <div className="text-lg font-semibold text-white">{fmt(proposal.window_start_time)}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/40 p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/50">Last meal</div>
            <div className="text-lg font-semibold text-white">{fmt(proposal.window_end_time)}</div>
          </div>
        </div>
      </div>
      <Section title="Why this plan works for you" defaultOpen>
        <ul className="space-y-2 text-sm text-white/80">
          {proposal.reasoning.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--primary))]" />
              <span>{humanize(r)}</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Your eating schedule">
        <EatingScheduleBreakdown items={proposal.schedule_breakdown} />
      </Section>
      <Section title="What to expect week 1">
        <ul className="space-y-2 text-sm text-white/80">
          {proposal.expectations.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-white/40" />
              <span>{humanize(r)}</span>
            </li>
          ))}
        </ul>
      </Section>
      <div className="mt-2 space-y-2 pb-2">
        <Button
          onClick={onAccept}
          disabled={loading}
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-semibold"
        >
          <Check className="mr-2 h-4 w-4" /> Accept Plan
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={onAdjust}
            disabled={loading}
            variant="outline"
            size="lg"
            className="h-14 rounded-2xl border-white/15 bg-white/[0.02] text-base font-medium text-white"
          >
            <Settings2 className="mr-2 h-4 w-4" /> Adjust
          </Button>
          <Button
            onClick={onRegenerate}
            disabled={loading}
            variant="outline"
            size="lg"
            className="h-14 rounded-2xl border-white/15 bg-white/[0.02] text-base font-medium text-white"
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
          </Button>
        </div>
      </div>
    </div>
  );
}