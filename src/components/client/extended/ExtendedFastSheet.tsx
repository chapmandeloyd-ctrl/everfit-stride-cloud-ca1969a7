import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { AlertTriangle, Check } from "lucide-react";
import {
  EXTENDED_FAST_PRESETS,
  buildExtendedFastPlan,
  formatDurationLabel,
  formatPhaseMoment,
  type ExtendedFastPreset,
} from "@/lib/extendedFast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  starting?: boolean;
  /** Called with the chosen preset. `startNow` skips the prepare phase. */
  onStart: (input: { preset: ExtendedFastPreset; startNow: boolean }) => void;
}

export function ExtendedFastSheet({ open, onOpenChange, starting = false, onStart }: Props) {
  const [presetId, setPresetId] = useState(EXTENDED_FAST_PRESETS[0].id);
  const [startNow, setStartNow] = useState(true);
  const [ack, setAck] = useState(false);

  const preset = EXTENDED_FAST_PRESETS.find((p) => p.id === presetId)!;

  const plan = useMemo(() => {
    const base = new Date();
    const full = buildExtendedFastPlan(preset, base);
    if (!startNow) return full;
    // Starting now means the fast begins immediately — drop the prepare phase
    // and re-anchor the remaining phases to right now.
    const noPrep = buildExtendedFastPlan({ ...preset, prepareHours: 0 }, base);
    return { ...noPrep, phases: noPrep.phases.filter((p) => p.id !== "prepare") };
  }, [preset, startNow]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>Extended fast</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 pb-8 pt-4">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            An extended fast runs in three phases — prepare, fast, then refeed. The refeed matters as much as
            the fast itself.
          </p>

          {/* Preset picker */}
          <section className="space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pick your length</p>
            <div className="grid grid-cols-4 gap-2">
              {EXTENDED_FAST_PRESETS.map((p) => {
                const active = p.id === presetId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPresetId(p.id)}
                    className={cn(
                      "flex flex-col items-center rounded-xl border py-3 transition",
                      active
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-card text-foreground",
                    )}
                  >
                    <span className="text-base font-black">{p.shortLabel}</span>
                    <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                      {p.level}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-bold text-foreground">{preset.label}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{preset.description}</p>
              <ul className="mt-3 space-y-1">
                {preset.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Start mode */}
          <section className="space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">When do you start?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStartNow(true)}
                className={cn(
                  "rounded-xl border p-3 text-left transition",
                  startNow ? "border-primary bg-primary/10" : "border-border bg-card",
                )}
              >
                <span className="text-xs font-bold text-foreground">Start fasting now</span>
                <span className="mt-1 block text-[10px] leading-relaxed text-muted-foreground">
                  The timer runs immediately.
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStartNow(false)}
                className={cn(
                  "rounded-xl border p-3 text-left transition",
                  !startNow ? "border-primary bg-primary/10" : "border-border bg-card",
                )}
              >
                <span className="text-xs font-bold text-foreground">Prepare first</span>
                <span className="mt-1 block text-[10px] leading-relaxed text-muted-foreground">
                  {preset.prepareHours}h of prep, then fast.
                </span>
              </button>
            </div>
          </section>

          {/* Dated phase timeline */}
          <section className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Your plan for {preset.shortLabel}
            </p>
            <div className="space-y-0">
              {plan.phases.map((phase, i) => (
                <div key={phase.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: phase.color }}
                    />
                    <span className="w-px flex-1 bg-border" />
                  </div>
                  <div className="flex-1 pb-5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-bold text-foreground">{phase.label}</p>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">
                          {formatDurationLabel(phase.hours)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{phase.hours} Hours</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {i === 0 && startNow ? "Now" : formatPhaseMoment(phase.start)}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {phase.guidance.map((g) => (
                        <li key={g} className="text-[11px] leading-relaxed text-muted-foreground">
                          • {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
              <div className="flex gap-3">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">End</p>
                  <p className="text-[11px] text-muted-foreground">{formatPhaseMoment(plan.endsAt)}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Safety */}
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div className="space-y-2">
                <p className="text-xs font-bold text-amber-300">Before you start</p>
                <ul className="space-y-1 text-[11px] leading-relaxed text-muted-foreground">
                  <li>Electrolytes daily — sodium, potassium and magnesium.</li>
                  <li>Stop if you feel faint, get palpitations, or can't stand up.</li>
                  <li>Not for pregnancy, diabetes, eating disorder history, or under 18.</li>
                  <li>Talk to your doctor first if you take any medication.</li>
                  <li>This app is not medical advice.</li>
                </ul>
                <label className="flex items-start gap-2 pt-1">
                  <Checkbox checked={ack} onCheckedChange={(v) => setAck(v === true)} className="mt-0.5" />
                  <span className="text-[11px] font-medium text-foreground">
                    I've read this and I'm cleared to do an extended fast.
                  </span>
                </label>
              </div>
            </div>
          </section>

          <Button
            className="w-full"
            size="lg"
            disabled={!ack || starting}
            onClick={() => onStart({ preset, startNow })}
          >
            {starting
              ? "Starting…"
              : startNow
                ? `Start ${preset.shortLabel} fast now`
                : `Begin ${preset.prepareHours}h prep for ${preset.shortLabel}`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}