import { useEffect, useMemo, useRef, useState } from "react";
import { Trophy, Check, AlertTriangle, X, Share2, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { Link } from "react-router-dom";

type Log = {
  started_at: string;
  ended_at: string;
  target_hours: number;
  actual_hours: number;
  completion_pct: number;
  status: string;
};

interface Props {
  accent: string;
  protocolName?: string;
  ketoName?: string;
  startDate: Date;
  durationDays: number;
  fastingLogs?: Log[];
  fastDayIndexes: number[]; // which day-offsets in the window were fast/refeed days (target days)
  clientName?: string;
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function PlanCompletionSummary({
  accent, protocolName, ketoName, startDate, durationDays, fastingLogs, fastDayIndexes, clientName,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const clientId = useEffectiveClientId();

  const stats = useMemo(() => {
    const byDay = new Map<string, { pct: number; actual: number; target: number }>();
    for (const l of fastingLogs || []) {
      const k = dateKey(new Date(l.ended_at));
      const prev = byDay.get(k);
      const pct = Number(l.completion_pct);
      if (!prev || pct > prev.pct) {
        byDay.set(k, { pct, actual: Number(l.actual_hours), target: Number(l.target_hours) });
      }
    }
    let completed = 0, partial = 0, missed = 0, totalHours = 0, targetHours = 0;
    const fastSet = new Set(fastDayIndexes);
    for (let i = 0; i < durationDays; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const isTargetDay = fastSet.has(i);
      if (!isTargetDay) continue;
      const log = byDay.get(dateKey(d));
      if (!log) missed++;
      else {
        totalHours += log.actual;
        targetHours += log.target;
        if (log.pct >= 100) completed++;
        else partial++;
      }
    }
    const totalTargets = completed + partial + missed;
    const successRate = totalTargets ? Math.round((completed / totalTargets) * 100) : 0;
    return { completed, partial, missed, totalTargets, totalHours, targetHours, successRate };
  }, [fastingLogs, fastDayIndexes, startDate, durationDays]);

  // Persist completion snapshot (idempotent via unique client_id/start_date/duration_days)
  const savedRef = useRef(false);
  useEffect(() => {
    if (savedRef.current || !clientId || !startDate || !durationDays) return;
    if (stats.totalTargets === 0) return;
    savedRef.current = true;
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + durationDays - 1);
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    supabase
      .from("plan_completions" as any)
      .upsert(
        {
          client_id: clientId,
          protocol_name: protocolName ?? null,
          keto_name: ketoName ?? null,
          start_date: iso(startDate),
          end_date: iso(endDate),
          duration_days: durationDays,
          completed_count: stats.completed,
          partial_count: stats.partial,
          missed_count: stats.missed,
          total_hours: Math.round(stats.totalHours * 10) / 10,
          target_hours: Math.round(stats.targetHours * 10) / 10,
          success_rate: stats.successRate,
        },
        { onConflict: "client_id,start_date,duration_days" }
      )
      .then(({ error }) => {
        if (error) console.warn("[plan_completions] save failed:", error.message);
      });
  }, [clientId, startDate, durationDays, protocolName, ketoName, stats]);

  const shareText = useMemo(() => {
    const lines = [
      `I just completed my ${durationDays}-day fasting plan! 🏆`,
      protocolName ? `Protocol: ${protocolName}${ketoName ? ` · ${ketoName}` : ""}` : "",
      `✅ ${stats.completed} completed · ⚠️ ${stats.partial} partial · ❌ ${stats.missed} missed`,
      `Success rate: ${stats.successRate}% · ${Math.round(stats.totalHours)}h fasted`,
      `via Apex360-IF`,
    ].filter(Boolean);
    return lines.join("\n");
  }, [durationDays, protocolName, ketoName, stats]);

  const renderCardToBlob = async (): Promise<Blob | null> => {
    const node = cardRef.current;
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    const w = Math.ceil(rect.width);
    const h = Math.ceil(rect.height);
    const clone = node.cloneNode(true) as HTMLElement;
    const bg = getComputedStyle(document.body).backgroundColor || "#000";
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" style="background:${bg};padding:0;margin:0;font-family:Inter,system-ui,sans-serif;color:#fff;">
            ${clone.outerHTML}
          </div>
        </foreignObject>
      </svg>`;
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error("img load"));
        img.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = w * 2;
      canvas.height = h * 2;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      return await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), "image/png"));
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const handleShare = async () => {
    setBusy(true);
    try {
      const blob = await renderCardToBlob().catch(() => null);
      const file = blob
        ? new File([blob], `fasting-plan-${durationDays}day-results.png`, { type: "image/png" })
        : null;
      const shareData: ShareData = {
        title: "My fasting plan results",
        text: shareText,
      };
      if (file && (navigator as any).canShare?.({ files: [file] })) {
        (shareData as any).files = [file];
      }
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareText);
        toast.success("Results copied to clipboard");
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(shareText);
          toast.success("Summary copied instead");
        } catch {
          toast.error("Couldn't share");
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareText);
    toast.success("Summary copied");
  };

  const handleDownload = async () => {
    setBusy(true);
    try {
      const blob = await renderCardToBlob();
      if (!blob) throw new Error("render failed");
      const pngUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `fasting-plan-${durationDays}day-results.png`;
      a.click();
      URL.revokeObjectURL(pngUrl);
      toast.success("Saved to your device");
    } catch {
      await navigator.clipboard.writeText(shareText);
      toast.success("Image export unsupported — summary copied instead");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-2xl border p-5"
        style={{
          borderColor: `${accent}55`,
          background: `radial-gradient(120% 100% at 0% 0%, ${accent}22, transparent 60%), radial-gradient(120% 100% at 100% 100%, ${accent}18, transparent 60%), hsl(var(--card))`,
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: `${accent}22`, boxShadow: `0 0 20px ${accent}55` }}
          >
            <Trophy className="h-5 w-5" style={{ color: accent }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: accent }}>
              Plan complete
            </p>
            <p className="text-base font-bold leading-tight">
              {clientName ? `${clientName} finished ` : "You finished "}
              the {durationDays}-day{protocolName ? ` ${protocolName}` : ""} plan
            </p>
            {ketoName && (
              <p className="text-xs text-muted-foreground mt-0.5">Keto type: {ketoName}</p>
            )}
          </div>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <StatTile icon={<Check className="h-4 w-4" />} label="Completed" value={stats.completed} color="#22c55e" />
          <StatTile icon={<AlertTriangle className="h-4 w-4" />} label="Partial" value={stats.partial} color="#f59e0b" />
          <StatTile icon={<X className="h-4 w-4" />} label="Missed" value={stats.missed} color="#ef4444" />
        </div>

        {/* Success rate bar */}
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground uppercase tracking-wider font-semibold">Success rate</span>
            <span className="font-bold tabular-nums" style={{ color: accent }}>{stats.successRate}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${stats.successRate}%`, background: accent, boxShadow: `0 0 10px ${accent}` }}
            />
          </div>
        </div>

        {/* Totals row */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <MiniStat label="Fasted" value={`${Math.round(stats.totalHours)}h`} />
          <MiniStat label="Target" value={`${Math.round(stats.targetHours)}h`} />
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-4 tracking-wider uppercase">
          Apex360-IF · Fasting Program
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button variant="default" size="sm" onClick={handleShare} disabled={busy}
          style={{ background: accent }} className="text-white">
          <Share2 className="h-4 w-4 mr-1.5" /> Share
        </Button>
        <Button variant="outline" size="sm" onClick={handleCopy} disabled={busy}>
          <Copy className="h-4 w-4 mr-1.5" /> Copy
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload} disabled={busy}>
          <Download className="h-4 w-4 mr-1.5" /> Save
        </Button>
      </div>

      <p className="text-xs text-muted-foreground leading-snug">
        Amazing work — you and your coach will review results and set your next plan.
      </p>
      <Link
        to="/client/plan-history"
        className="block text-center text-xs font-semibold underline underline-offset-4"
        style={{ color: accent }}
      >
        View plan history →
      </Link>
    </div>
  );
}

function StatTile({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div
      className="rounded-xl border p-2.5 flex flex-col items-center justify-center gap-0.5"
      style={{ borderColor: `${color}44`, background: `${color}10` }}
    >
      <span style={{ color }}>{icon}</span>
      <p className="text-xl font-bold tabular-nums leading-none mt-1" style={{ color }}>{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}