import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Scale,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useSmartPace } from "@/hooks/useSmartPace";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { SmartPaceBanner } from "./SmartPaceBanner";

/**
 * Collapsible wrapper for the Smart Pace tracker.
 * Front of card = at-a-glance: today's target, status, weight start→goal, progress %.
 * Tap to expand to the full banner (Journal + My Why live inside).
 */
export function SmartPaceCollapsible() {
  const { data } = useSmartPace();
  const clientId = useEffectiveClientId();
  const [open, setOpen] = useState(false);

  // Latest weight entry — for compact "now" reading on the card face.
  const { data: latestWeight } = useQuery({
    queryKey: ["smart-pace-collapsible-latest-weight", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      if (!clientId) return null;
      const { data: defs } = await supabase
        .from("metric_definitions")
        .select("id")
        .eq("name", "Weight")
        .limit(1);
      const defId = defs?.[0]?.id;
      if (!defId) return null;
      const { data: cm } = await supabase
        .from("client_metrics")
        .select("id")
        .eq("client_id", clientId)
        .eq("metric_definition_id", defId)
        .limit(1);
      const cmId = cm?.[0]?.id;
      if (!cmId) return null;
      const { data: entry } = await supabase
        .from("metric_entries")
        .select("value")
        .eq("client_metric_id", cmId)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return entry?.value ?? null;
    },
    staleTime: 30_000,
  });

  if (!data?.enabled || !data.goal) return null;

  const { todayTargetLbs, status, progressPct } = data;

  const tone =
    status === "behind" || status === "missed"
      ? {
          iconBg: "bg-destructive/10",
          iconColor: "text-destructive",
          pill: "bg-destructive/15 text-destructive ring-destructive/30",
          label: status === "missed" ? "Catch up" : "Behind",
        }
      : status === "ahead"
      ? {
          iconBg: "bg-sky-500/10",
          iconColor: "text-sky-500",
          pill: "bg-sky-500/15 text-sky-600 dark:text-sky-300 ring-sky-500/30",
          label: "Ahead",
        }
      : {
          iconBg: "bg-amber-400/15",
          iconColor: "text-amber-500",
          pill: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 ring-emerald-500/30",
          label: "On pace",
        };

  if (open) {
    return (
      <div className="space-y-2">
        <SmartPaceBanner allowRender />
        <button
          onClick={() => setOpen(false)}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-muted/40 hover:bg-muted/60 ring-1 ring-border py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition"
        >
          <ChevronUp className="h-3.5 w-3.5" />
          Hide details
        </button>
      </div>
    );
  }

  // Compact summary line (matches the reference screenshot height).
  const summary =
    latestWeight !== null && latestWeight !== undefined
      ? `${todayTargetLbs.toFixed(1)} lb today · ${latestWeight.toFixed(1)} now · ${Math.round(progressPct)}%`
      : `${todayTargetLbs.toFixed(1)} lb today · ${Math.round(progressPct)}%`;

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="w-full flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition hover:bg-muted/40 active:scale-[0.995]"
    >
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tone.iconBg)}>
        <Scale className={cn("h-5 w-5", tone.iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-foreground">
            Weight Tracker
          </span>
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wide rounded-full px-1.5 py-0.5 ring-1",
              tone.pill
            )}
          >
            {tone.label}
          </span>
        </div>
        <p className="text-sm text-muted-foreground truncate">{summary}</p>
      </div>
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
