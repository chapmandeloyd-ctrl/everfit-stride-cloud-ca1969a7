import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Timer, X } from "lucide-react";
import { ExtendedFastSheet } from "./ExtendedFastSheet";
import { useJuiceFast } from "@/hooks/useJuiceFast";
import { useActiveFastElapsed } from "@/hooks/useActiveFastElapsed";
import { useStartFast } from "@/hooks/useStartFast";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { ExtendedFastPreset } from "@/lib/extendedFast";

interface PrepPlan {
  presetId: string;
  shortLabel: string;
  fastHours: number;
  fastStartsAt: number;
}

function prepKey(clientId: string | null | undefined) {
  return `extfast_prep_${clientId ?? "anon"}`;
}

function fmt(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/**
 * Dashboard entry point for extended (24h+) fasts.
 * Hidden while a juice fast or a regular fast is already running.
 */
export function ExtendedFastButton({ autoOpen = false }: { autoOpen?: boolean }) {
  const { session } = useJuiceFast();
  const { isFasting } = useActiveFastElapsed();
  const clientId = useEffectiveClientId();
  const startFast = useStartFast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [prep, setPrep] = useState<PrepPlan | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const key = prepKey(clientId);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(key);
    setPrep(raw ? (JSON.parse(raw) as PrepPlan) : null);
  }, [key]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  const clearPrep = () => {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
    setPrep(null);
  };

  const beginFast = async (hours: number) => {
    if (!clientId) return;
    await supabase
      .from("client_feature_settings")
      .update({ active_fast_target_hours: hours } as any)
      .eq("client_id", clientId);
    await startFast.mutateAsync(undefined);
    qc.invalidateQueries({ queryKey: ["active-fast-elapsed", clientId] });
  };

  const handleStart = async ({ preset, startNow }: { preset: ExtendedFastPreset; startNow: boolean }) => {
    if (startNow) {
      await beginFast(preset.fastHours);
      setOpen(false);
      clearPrep();
      return;
    }
    const plan: PrepPlan = {
      presetId: preset.id,
      shortLabel: preset.shortLabel,
      fastHours: preset.fastHours,
      fastStartsAt: Date.now() + preset.prepareHours * 3_600_000,
    };
    if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(plan));
    setPrep(plan);
    setOpen(false);
  };

  if (session || isFasting) return null;

  if (prep) {
    const remaining = prep.fastStartsAt - now;
    const ready = remaining <= 0;
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">
              {ready ? `Prep done — ${prep.shortLabel} fast ready` : `Preparing for your ${prep.shortLabel} fast`}
            </p>
            {!ready && (
              <p className="mt-1 text-2xl font-black leading-none tabular-nums text-foreground">
                {fmt(remaining)}
              </p>
            )}
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              Taper carbs, salt your last meal, load electrolytes.
            </p>
          </div>
          <button
            type="button"
            onClick={clearPrep}
            aria-label="Cancel prep"
            className="shrink-0 rounded-md border border-border bg-background/60 p-2 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <Button
          className="mt-3 h-12 w-full rounded-xl text-sm font-semibold"
          disabled={startFast.isPending}
          onClick={async () => {
            await beginFast(prep.fastHours);
            clearPrep();
          }}
        >
          {startFast.isPending ? "Starting…" : `Start my ${prep.shortLabel} fast`}
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="h-12 w-full rounded-xl text-sm font-semibold"
      >
        <Timer className="mr-2 h-4 w-4" />
        Start an extended fast
      </Button>
      <ExtendedFastSheet
        open={open}
        onOpenChange={setOpen}
        starting={startFast.isPending}
        onStart={handleStart}
      />
    </>
  );
}