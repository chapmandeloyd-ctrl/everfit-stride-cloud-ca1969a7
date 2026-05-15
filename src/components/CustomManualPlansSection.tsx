import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Minus, Plus, Hourglass, UtensilsCrossed, Clock, ChevronRight, Sparkles, ArrowLeft, CheckCircle2, ArrowRight } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useToast } from "@/hooks/use-toast";
import {
  CUSTOM_MANUAL_PLANS,
  type CustomManualPlan,
  setActiveCustomFastPlan,
  setActiveCustomEatPlan,
} from "@/lib/customManualPlans";

function formatHour(h: number): string {
  const hr = ((h % 24) + 24) % 24;
  const period = hr >= 12 ? "PM" : "AM";
  const display = hr % 12 === 0 ? 12 : hr % 12;
  return `${display}:00 ${period}`;
}

export function CustomManualPlansSection() {
  const [active, setActive] = useState<CustomManualPlan | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-bold">Custom Manual Plans</h2>
      </div>
      <p className="text-xs text-muted-foreground -mt-1">
        Set your own window. Some plans have locked durations.
      </p>

      <div className="space-y-4">
        {CUSTOM_MANUAL_PLANS.map((plan, idx) => (
          <DynamicPlanCard key={plan.id} plan={plan} index={idx} onClick={() => setActive(plan)} />
        ))}
      </div>

      <PlanSheet plan={active} onClose={() => setActive(null)} />
    </div>
  );
}

/* ---------- Dynamic, premium-feeling plan card ---------- */

function accentToHex(accent: string): string {
  // map tailwind accent classes to a representative HSL for gradients/glow
  if (accent.includes("violet")) return "262 83% 70%";
  if (accent.includes("emerald")) return "152 76% 55%";
  if (accent.includes("teal")) return "172 76% 55%";
  if (accent.includes("rose")) return "350 90% 75%";
  if (accent.includes("fuchsia")) return "292 84% 65%";
  return "0 84% 60%";
}

function DynamicPlanCard({
  plan,
  index,
  onClick,
}: {
  plan: CustomManualPlan;
  index: number;
  onClick: () => void;
}) {
  const hsl = accentToHex(plan.accent);
  const ratio = plan.manual
    ? 0.5
    : Math.max(0, Math.min(1, plan.fastHours / 24));

  const ariaLabel = plan.manual
    ? `${plan.name}: ${plan.tagline}. Manual plan — open or start anytime.`
    : plan.goalMode
      ? `${plan.name}: ${plan.tagline}. Goal mode, ${plan.fastHours} hour fast and ${plan.eatHours} hour eating window.`
      : `${plan.name}: ${plan.tagline}. ${plan.fastHours} hour fast, ${plan.eatHours} hour eating window.${plan.lockedEat || plan.lockedFast ? " Some durations are locked." : ""}`;

  return (
    <button
      onClick={onClick}
      type="button"
      aria-label={ariaLabel}
      className="group relative w-full text-left animate-fade-in rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      style={{ animationDelay: `${index * 60}ms` }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Outer glow ring */}
      <div
        aria-hidden
        className="absolute -inset-[1px] rounded-2xl opacity-60 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-500 blur-[2px]"
        style={{
          background: `linear-gradient(135deg, hsl(${hsl} / 0.55), transparent 40%, hsl(${hsl} / 0.35))`,
        }}
      />
      {/* Keyboard focus ring — uses accent color */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-[3px] rounded-[18px] opacity-0 group-focus-visible:opacity-100 transition-opacity"
        style={{
          boxShadow: `0 0 0 2px hsl(${hsl}), 0 0 0 4px hsl(var(--background))`,
        }}
      />
      {/* Card surface */}
      <div
        className="relative overflow-hidden rounded-2xl border border-white/5 transition-transform duration-300 group-active:scale-[0.985]"
        style={{
          background:
            "linear-gradient(160deg, hsl(var(--card)) 0%, hsl(var(--card)) 55%, hsl(var(--muted) / 0.5) 100%)",
          boxShadow:
            `0 24px 48px -20px hsl(${hsl} / 0.45), 0 8px 24px -10px hsl(0 0% 0% / 0.55), inset 0 1px 0 hsl(0 0% 100% / 0.06), inset 0 -1px 0 hsl(0 0% 0% / 0.4)`,
        }}
      >
        {/* Animated accent orb */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full opacity-40 blur-3xl transition-all duration-700 group-hover:opacity-70 group-hover:scale-110"
          style={{ background: `radial-gradient(circle, hsl(${hsl} / 0.9), transparent 70%)` }}
        />
        {/* Shimmer sweep on hover */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"
          style={{
            background:
              "linear-gradient(110deg, transparent 30%, hsl(0 0% 100% / 0.07) 50%, transparent 70%)",
          }}
        />

        <div className="relative p-5">
          {/* Top row: icon badge + locked chip */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10"
              style={{
                background: `linear-gradient(135deg, hsl(${hsl} / 0.25), hsl(${hsl} / 0.05))`,
                boxShadow: `inset 0 0 12px hsl(${hsl} / 0.25)`,
              }}
            >
              {plan.manual ? (
                <Sparkles className="h-5 w-5" style={{ color: `hsl(${hsl})` }} />
              ) : (
                <Hourglass className="h-5 w-5" style={{ color: `hsl(${hsl})` }} />
              )}
            </div>
            <div className="flex items-center gap-2">
              {!plan.manual && !plan.goalMode && (
                <span
                  className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest"
                  style={{
                    background: `hsl(${hsl} / 0.15)`,
                    color: `hsl(${hsl})`,
                    border: `1px solid hsl(${hsl} / 0.35)`,
                  }}
                >
                  {plan.fastHours}h fast
                </span>
              )}
              {(plan.lockedEat || plan.lockedFast) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary border border-primary/30">
                  <Lock className="h-3 w-3" /> Locked
                </span>
              )}
            </div>
          </div>

          {/* Title + tagline */}
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h3
                className={`text-2xl font-black tracking-tight leading-none ${plan.accent} drop-shadow-[0_2px_12px_rgba(0,0,0,0.4)]`}
              >
                {plan.name}
              </h3>
              <p className="text-[13px] font-semibold text-foreground/90 mt-1.5">{plan.tagline}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{plan.description}</p>
            </div>
            <div
              aria-hidden
              className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-background/50 transition-transform duration-300 group-hover:translate-x-1 group-focus-visible:translate-x-1"
              style={{ boxShadow: `inset 0 0 10px hsl(${hsl} / 0.3)` }}
            >
              <ChevronRight className="h-4 w-4" style={{ color: `hsl(${hsl})` }} />
            </div>
          </div>

          {/* Stats / progress bar */}
          {!plan.manual ? (
            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5" style={{ color: `hsl(${hsl})` }}>
                  <Hourglass className="h-3.5 w-3.5" /> {plan.fastHours}h fast
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  {plan.eatHours}h eat <UtensilsCrossed className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/40">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                  style={{
                    width: `${ratio * 100}%`,
                    background: `linear-gradient(90deg, hsl(${hsl} / 0.9), hsl(${hsl} / 0.5))`,
                    boxShadow: `0 0 12px hsl(${hsl} / 0.6)`,
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <span
                className="h-1.5 w-1.5 rounded-full animate-pulse"
                style={{ background: `hsl(${hsl})` }}
              />
              Tap to open or start anytime
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function PlanSheet({ plan, onClose }: { plan: CustomManualPlan | null; onClose: () => void }) {
  // see DynamicSheetShell below
  const clientId = useEffectiveClientId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [eatHours, setEatHours] = useState<number>(plan?.eatHours ?? 0);
  const [fastHours, setFastHours] = useState<number>(plan?.fastHours ?? 0);
  const [openHour, setOpenHour] = useState<number>(plan?.defaultOpenHour ?? 8);
  const [pendingMode, setPendingMode] = useState<"fast" | "eat" | null>(null);

  // Reset state when plan changes
  useMemo(() => {
    if (plan) {
      setEatHours(plan.eatHours);
      setFastHours(plan.fastHours);
      setOpenHour(plan.defaultOpenHour);
      setPendingMode(null);
    }
  }, [plan?.id]);

  const start = useMutation({
    mutationFn: async (mode: "fast" | "eat") => {
      if (!clientId || !plan) throw new Error("Missing client or plan");
      const now = new Date();
      const updates: Record<string, any> = {};

      if (mode === "fast") {
        updates.active_fast_start_at = now.toISOString();
        // Manual plan = open-ended fast; default 24h target so the timer has
        // something to render. The user ends it manually whenever.
        updates.active_fast_target_hours = plan.goalMode
          ? fastHours
          : plan.manual
            ? 24
            : plan.fastHours;
        updates.eating_window_ends_at = null;
      } else {
        const effectiveEatHours = plan.manual && eatHours <= 0 ? 8 : eatHours;
        const ends = new Date(now.getTime() + effectiveEatHours * 3600 * 1000);
        updates.eating_window_ends_at = ends.toISOString();
        updates.eating_window_hours = effectiveEatHours;
        updates.active_fast_start_at = null;
        updates.active_fast_target_hours = null;
      }

      const { error } = await supabase
        .from("client_feature_settings")
        .update(updates)
        .eq("client_id", clientId);
      if (error) throw error;
      // Tag which custom plan is now driving the timer/eating window so the
      // dashboard can override labels + accent colors.
      if (mode === "fast") {
        setActiveCustomFastPlan(plan.id);
        setActiveCustomEatPlan(null);
      } else {
        setActiveCustomEatPlan(plan.id);
        setActiveCustomFastPlan(null);
      }
    },
    onSuccess: (_d, mode) => {
      queryClient.invalidateQueries({ queryKey: ["meal-engine-state"] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings"] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings-fasting"] });
      queryClient.invalidateQueries({ queryKey: ["fasting-gate-state"] });
      queryClient.invalidateQueries({ queryKey: ["today-fasting-log"] });
      queryClient.invalidateQueries({ queryKey: ["client-feature-settings"] });
      toast({
        title: mode === "fast" ? "Fast started" : "Eating window opened",
        description: plan?.name,
      });
      onClose();
      // Take the user straight to the lion timer on the dashboard.
      navigate("/client/dashboard");
    },
    onError: (e: any) => {
      toast({ title: "Couldn't start plan", description: e.message, variant: "destructive" });
    },
  });

  if (!plan) return null;

  const closeHour = (openHour + eatHours) % 24;
  const eatLocked = plan.lockedEat;
  const fastLocked = plan.lockedFast;
  const eatMin = plan.eatRange?.[0] ?? eatHours;
  const eatMax = plan.eatRange?.[1] ?? eatHours;
  const fastMin = plan.fastRange?.[0] ?? fastHours;
  const fastMax = plan.fastRange?.[1] ?? fastHours;

  // Default action for non-manual plans is "fast" (we start the fast,
  // eating opens after it ends)
  const requestStart = (mode: "fast" | "eat") => setPendingMode(mode);

  if (pendingMode) {
    return (
      <Sheet open={!!plan} onOpenChange={(o) => !o && onClose()}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl max-h-[92vh] overflow-y-auto bg-background border-border p-0"
        >
          <DynamicSheetShell plan={plan}>
            <ConfirmPreview
              plan={plan}
              mode={pendingMode}
              fastHours={plan.goalMode ? fastHours : plan.fastHours}
              eatHours={eatHours}
              openHour={openHour}
              isPending={start.isPending}
              onBack={() => setPendingMode(null)}
              onConfirm={() => start.mutate(pendingMode)}
            />
          </DynamicSheetShell>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={!!plan} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[92vh] overflow-y-auto bg-background border-border p-0">
        <DynamicSheetShell plan={plan} showHero>
          {!plan.manual && !plan.goalMode && (
            <p className="text-xs font-bold uppercase tracking-wider text-foreground/80 mb-3">
              {plan.fastHours}hr fasting — {eatHours}hr eating
            </p>
          )}
          <div className="space-y-4">
          {plan.goalMode ? (
            <>
              <Stepper
                label="Set Fasting Duration"
                value={fastHours}
                onChange={setFastHours}
                min={fastMin}
                max={fastMax}
                suffix="h"
                disabled={false}
              />
              <Stepper
                label="Set Eating Duration"
                value={eatHours}
                onChange={setEatHours}
                min={eatMin}
                max={eatMax}
                suffix="h"
                disabled={false}
              />
            </>
          ) : plan.manual ? (
            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center text-sm text-muted-foreground">
                Open your eating window or start fasting whenever you choose.
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="p-5 space-y-4">
                <div className="text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Eating Window {eatLocked && <Lock className="inline h-3 w-3 ml-1" />}
                  </p>
                  <p className="text-3xl font-black mt-1">{eatHours}h</p>
                </div>

                {!eatLocked && (
                  <Stepper
                    label="Adjust Duration"
                    value={eatHours}
                    onChange={setEatHours}
                    min={eatMin}
                    max={eatMax}
                    suffix="h"
                    disabled={false}
                  />
                )}

                <div className="grid grid-cols-2 gap-3 text-center pt-2 border-t border-border">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Opens at
                    </p>
                    <p className="text-lg font-black mt-1">{formatHour(openHour)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Closes at
                    </p>
                    <p className="text-lg font-black mt-1 text-muted-foreground">
                      {formatHour(closeHour)}
                    </p>
                  </div>
                </div>

                <Stepper
                  label="Window Start Hour"
                  value={openHour}
                  onChange={(v) => setOpenHour(((v % 24) + 24) % 24)}
                  min={0}
                  max={23}
                  suffix=""
                  formatValue={(v) => formatHour(v)}
                />
              </CardContent>
            </Card>
          )}

          {plan.manual ? (
            <div className="space-y-2 pt-2">
              <p className="text-center text-sm font-semibold text-muted-foreground">
                Choose what you want to start with
              </p>
              <Button
                className="w-full h-12 text-base font-bold"
                onClick={() => requestStart("eat")}
              >
                Open Eating Window
              </Button>
              <p className="text-center text-xs text-muted-foreground">or</p>
              <Button
                variant="secondary"
                className="w-full h-12 text-base font-bold"
                onClick={() => requestStart("fast")}
              >
                Start Fasting
              </Button>
            </div>
          ) : (
            <Button
              className="w-full h-12 text-base font-bold"
              onClick={() => requestStart("fast")}
            >
              Review &amp; Start
            </Button>
          )}
          </div>
        </DynamicSheetShell>
      </SheetContent>
    </Sheet>
  );
}

/* ---------- Confirmation / preview screen ---------- */

function ConfirmPreview({
  plan,
  mode,
  fastHours,
  eatHours,
  openHour,
  isPending,
  onBack,
  onConfirm,
}: {
  plan: CustomManualPlan;
  mode: "fast" | "eat";
  fastHours: number;
  eatHours: number;
  openHour: number;
  isPending: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  // live-update "now" so the preview times stay accurate while the sheet is open
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const fastStart = now;
  const fastEnd = new Date(now.getTime() + fastHours * 3600 * 1000);
  const eatStartFromFast = fastEnd;
  const eatEndFromFast = new Date(fastEnd.getTime() + eatHours * 3600 * 1000);

  // Manual eating-now path uses the picked open hour instead of "now"
  const manualEatStart = now;
  const manualEatEnd = new Date(now.getTime() + eatHours * 3600 * 1000);

  const fmt = (d: Date) =>
    d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const fmtDay = (d: Date) => {
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return "Today";
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return d.toDateString() === tomorrow.toDateString() ? "Tomorrow" : d.toLocaleDateString([], { weekday: "short" });
  };

  return (
    <>
      <SheetHeader className="text-left">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Edit
        </button>
        <SheetTitle className="text-xl font-black">Confirm your plan</SheetTitle>
        <p className={`text-sm font-bold ${plan.accent}`}>{plan.name}</p>
      </SheetHeader>

      <div className="mt-4 space-y-3">
        {mode === "fast" ? (
          <>
            {/* Fasting window */}
            <WindowRow
              kind="fast"
              title="Fasting Window"
              hours={fastHours}
              startLabel={`${fmtDay(fastStart)} • ${fmt(fastStart)}`}
              endLabel={
                plan.manual
                  ? "When you end it"
                  : `${fmtDay(fastEnd)} • ${fmt(fastEnd)}`
              }
              startCaption="Starts"
              endCaption="Ends"
            />
            {/* Eating window that follows */}
            {!plan.manual && eatHours > 0 && (
              <WindowRow
                kind="eat"
                title="Eating Window"
                hours={eatHours}
                startLabel={`${fmtDay(eatStartFromFast)} • ${fmt(eatStartFromFast)}`}
                endLabel={`${fmtDay(eatEndFromFast)} • ${fmt(eatEndFromFast)}`}
                startCaption="Opens"
                endCaption="Closes"
              />
            )}
          </>
        ) : (
          <WindowRow
            kind="eat"
            title="Eating Window"
            hours={eatHours}
            startLabel={`${fmtDay(manualEatStart)} • ${fmt(manualEatStart)}`}
            endLabel={`${fmtDay(manualEatEnd)} • ${fmt(manualEatEnd)}`}
            startCaption="Opens now"
            endCaption="Closes"
          />
        )}

        <Card className="bg-muted/20 border-border">
          <CardContent className="p-3 text-xs text-muted-foreground text-center">
            You can end this {mode === "fast" ? "fast" : "eating window"} early at any time from your dashboard.
          </CardContent>
        </Card>

        <div className="space-y-2 pt-1">
          <Button
            className="w-full h-12 text-base font-bold"
            onClick={onConfirm}
            disabled={isPending}
          >
            <CheckCircle2 className="h-5 w-5 mr-2" />
            {isPending ? "Starting..." : `Confirm & Start ${mode === "fast" ? "Fast" : "Eating Window"}`}
          </Button>
          <Button
            variant="ghost"
            className="w-full h-11 text-sm font-semibold"
            onClick={onBack}
            disabled={isPending}
          >
            Back to edit
          </Button>
        </div>
      </div>
    </>
  );
}

function WindowRow({
  kind,
  title,
  hours,
  startLabel,
  endLabel,
  startCaption,
  endCaption,
}: {
  kind: "fast" | "eat";
  title: string;
  hours: number;
  startLabel: string;
  endLabel: string;
  startCaption: string;
  endCaption: string;
}) {
  const isFast = kind === "fast";
  const accentHsl = isFast ? "0 84% 60%" : "152 76% 55%";
  const Icon = isFast ? Hourglass : UtensilsCrossed;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/5 p-4"
      style={{
        background:
          "linear-gradient(160deg, hsl(var(--card)) 0%, hsl(var(--card)) 60%, hsl(var(--muted) / 0.4) 100%)",
        boxShadow: `0 12px 32px -16px hsl(${accentHsl} / 0.4), inset 0 1px 0 hsl(0 0% 100% / 0.05)`,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full blur-3xl opacity-40"
        style={{ background: `radial-gradient(circle, hsl(${accentHsl} / 0.7), transparent 70%)` }}
      />
      <div className="relative">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10"
              style={{
                background: `linear-gradient(135deg, hsl(${accentHsl} / 0.25), hsl(${accentHsl} / 0.05))`,
              }}
            >
              <Icon className="h-4 w-4" style={{ color: `hsl(${accentHsl})` }} />
            </div>
            <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
          </div>
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-black"
            style={{
              background: `hsl(${accentHsl} / 0.15)`,
              color: `hsl(${accentHsl})`,
              border: `1px solid hsl(${accentHsl} / 0.35)`,
            }}
          >
            {hours}h
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {startCaption}
            </p>
            <p className="text-base font-black mt-0.5 truncate">{startLabel}</p>
          </div>
          <ArrowRight
            className="h-4 w-4 shrink-0"
            style={{ color: `hsl(${accentHsl})` }}
          />
          <div className="min-w-0 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {endCaption}
            </p>
            <p className="text-base font-black mt-0.5 truncate">{endLabel}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  suffix,
  disabled,
  formatValue,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  suffix: string;
  disabled?: boolean;
  formatValue?: (v: number) => string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="flex items-center justify-between gap-3 bg-muted/30 rounded-full p-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full bg-background h-9 w-9"
          disabled={disabled || value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="text-xl font-black">
          {formatValue ? formatValue(value) : `${value}${suffix}`}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full bg-background h-9 w-9"
          disabled={disabled || value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* ---------- Dynamic sheet shell — gives the open sheet color/depth ---------- */

function DynamicSheetShell({
  plan,
  showHero,
  children,
}: {
  plan: CustomManualPlan;
  showHero?: boolean;
  children: React.ReactNode;
}) {
  const hsl = accentToHex(plan.accent);
  const Icon = plan.manual ? Sparkles : Hourglass;

  return (
    <div className="relative overflow-hidden">
      {/* Tinted accent background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(120% 70% at 0% 0%, hsl(${hsl} / 0.22), transparent 55%), radial-gradient(120% 70% at 100% 0%, hsl(${hsl} / 0.14), transparent 60%), linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background)) 100%)`,
        }}
      />
      {/* Top decorative orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full blur-3xl opacity-50"
        style={{ background: `radial-gradient(circle, hsl(${hsl} / 0.7), transparent 70%)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 -left-20 h-52 w-52 rounded-full blur-3xl opacity-30"
        style={{ background: `radial-gradient(circle, hsl(${hsl} / 0.6), transparent 70%)` }}
      />
      {/* Subtle grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative px-6 pt-6 pb-8">
        {showHero && (
          <div className="mb-5">
            <div
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 mb-3"
              style={{
                background: `linear-gradient(135deg, hsl(${hsl} / 0.3), hsl(${hsl} / 0.08))`,
                boxShadow: `inset 0 0 14px hsl(${hsl} / 0.3), 0 8px 20px -6px hsl(${hsl} / 0.4)`,
              }}
            >
              <Icon className="h-6 w-6" style={{ color: `hsl(${hsl})` }} />
            </div>
            <SheetTitle
              className={`text-3xl font-black tracking-tight leading-tight ${plan.accent} drop-shadow-[0_2px_16px_rgba(0,0,0,0.5)]`}
            >
              {plan.name}
            </SheetTitle>
            <p className="text-sm font-semibold text-foreground/85 mt-2">{plan.tagline}</p>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              {plan.description}
            </p>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}