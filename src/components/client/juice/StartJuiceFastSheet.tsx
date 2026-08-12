import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AlertTriangle, Check, Lock } from "lucide-react";
import {
  DAY_PRESETS,
  JUICE_MODES,
  SELF_SERVE_MAX_DAYS,
  needsRefeed,
  type JuiceFastMode,
} from "@/lib/juiceFast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Trainers assigning for a client bypass the self-serve length cap. */
  isTrainer?: boolean;
  starting?: boolean;
  onStart: (input: { mode: JuiceFastMode; days: number }) => void;
}

export function StartJuiceFastSheet({ open, onOpenChange, isTrainer = false, starting = false, onStart }: Props) {
  const [mode, setMode] = useState<JuiceFastMode>("juice_only");
  const [days, setDays] = useState(3);
  const [customDays, setCustomDays] = useState("");
  const [ack, setAck] = useState(false);

  const locked = !isTrainer && days > SELF_SERVE_MAX_DAYS;
  const canStart = ack && !locked && days >= 1 && days <= 14;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>Start a juice fast</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 pb-8 pt-4">
          {/* Mode */}
          <section className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Choose your style</p>
            {JUICE_MODES.map((m) => {
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={cn(
                    "w-full rounded-xl border p-4 text-left transition",
                    active ? "border-primary bg-primary/10" : "border-border bg-card",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn("text-sm font-bold", active ? m.accent : "text-foreground")}>{m.label}</span>
                    {active && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{m.description}</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Allowed</p>
                      <ul className="mt-1 space-y-0.5">
                        {m.allows.map((a) => (
                          <li key={a} className="text-[11px] text-muted-foreground">{a}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-destructive">Avoid</p>
                      <ul className="mt-1 space-y-0.5">
                        {m.avoid.map((a) => (
                          <li key={a} className="text-[11px] text-muted-foreground">{a}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </button>
              );
            })}
          </section>

          {/* Duration */}
          <section className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">How many days?</p>
            <div className="flex flex-wrap gap-2">
              {DAY_PRESETS.map((d) => {
                const active = days === d && !customDays;
                const needsTrainer = !isTrainer && d > SELF_SERVE_MAX_DAYS;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDays(d);
                      setCustomDays("");
                    }}
                    className={cn(
                      "flex min-w-[64px] flex-col items-center rounded-lg border px-3 py-2 text-sm font-bold transition",
                      active ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-foreground",
                    )}
                  >
                    <span>{d}</span>
                    <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                      {d === 1 ? "day" : "days"}
                    </span>
                    {needsTrainer && <Lock className="mt-0.5 h-3 w-3 text-muted-foreground" />}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="juice-custom-days" className="text-xs text-muted-foreground">
                Custom
              </Label>
              <Input
                id="juice-custom-days"
                type="number"
                min={1}
                max={14}
                inputMode="numeric"
                value={customDays}
                placeholder="—"
                onChange={(e) => {
                  setCustomDays(e.target.value);
                  const n = parseInt(e.target.value, 10);
                  if (!Number.isNaN(n)) setDays(Math.min(14, Math.max(1, n)));
                }}
                className="h-9 w-20"
              />
              <span className="text-xs text-muted-foreground">days (max 14)</span>
            </div>

            {needsRefeed(days) && (
              <p className="rounded-lg bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
                A <strong className="text-foreground">refeed day</strong> is added after day {days}. Break the fast with
                broth, soft fruit and cooked vegetables before returning to normal meals.
              </p>
            )}

            {locked && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <p className="text-[11px] leading-relaxed text-destructive">
                  Juice fasts longer than {SELF_SERVE_MAX_DAYS} days have to be assigned by your coach. Message them to
                  unlock this length.
                </p>
              </div>
            )}
          </section>

          {/* Safety */}
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div className="space-y-2">
                <p className="text-xs font-bold text-amber-300">Before you start</p>
                <ul className="space-y-1 text-[11px] leading-relaxed text-muted-foreground">
                  <li>Take electrolytes daily — sodium, potassium and magnesium.</li>
                  <li>Stop immediately if you feel faint, get heart palpitations, or can't stand up.</li>
                  <li>Not for pregnancy, diabetes, eating disorder history, or anyone under 18.</li>
                  <li>Talk to your doctor first if you take any medication.</li>
                  <li>This app is not medical advice.</li>
                </ul>
                <label className="flex items-start gap-2 pt-1">
                  <Checkbox checked={ack} onCheckedChange={(v) => setAck(v === true)} className="mt-0.5" />
                  <span className="text-[11px] font-medium text-foreground">
                    I've read this and I'm cleared to juice fast.
                  </span>
                </label>
              </div>
            </div>
          </section>

          <Button
            className="w-full"
            size="lg"
            disabled={!canStart || starting}
            onClick={() => onStart({ mode, days })}
          >
            {starting ? "Starting…" : `Start ${days}-day juice fast`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}