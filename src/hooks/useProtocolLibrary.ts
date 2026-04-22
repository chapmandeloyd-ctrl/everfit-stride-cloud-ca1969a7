import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Unified entry shape for the merged protocol library carousel.
 * Wraps both quick_fasting_plans and fasting_protocols rows so the UI
 * doesn't have to branch per source row by row.
 */
export interface LibraryEntry {
  /** Composite key: `${source}:${id}` so React keys stay unique across tables. */
  key: string;
  source: "quick_plan" | "protocol";
  id: string;
  name: string;
  /** Total fast length in hours (renamed from fast_hours / fast_target_hours). */
  fastTargetHours: number;
  /** Multi-day program length, or 0 for window-based quick plans. */
  durationDays: number;
  /** Difficulty bucket — quick plans use difficulty_group, protocols use difficulty_level. */
  difficultyLabel: string;
  /** Min level required to unlock. Defaults to 1 if missing. */
  minLevelRequired: number;
  /** Stable sort key inside its bucket. */
  orderIndex: number;
  /** Original raw row, in case the card needs more fields. */
  raw: Record<string, unknown>;
}

interface LibraryResult {
  entries: LibraryEntry[];
  currentLevel: number;
  selectedKey: string | null;
}

function normalizeQuickPlan(row: any): LibraryEntry {
  return {
    key: `quick_plan:${row.id}`,
    source: "quick_plan",
    id: row.id,
    name: row.name,
    fastTargetHours: row.fast_hours,
    durationDays: 0,
    difficultyLabel: row.difficulty_group ?? "beginner",
    minLevelRequired: row.min_level_required ?? 1,
    orderIndex: row.order_index ?? 0,
    raw: row,
  };
}

function normalizeProtocol(row: any): LibraryEntry {
  return {
    key: `protocol:${row.id}`,
    source: "protocol",
    id: row.id,
    name: row.name,
    fastTargetHours: row.fast_target_hours,
    durationDays: row.duration_days ?? 0,
    difficultyLabel: row.difficulty_level ?? "beginner",
    minLevelRequired: row.min_level_required ?? 1,
    // Protocols don't have a global order_index — sort by level then hours.
    orderIndex: (row.min_level_required ?? 1) * 1000 + (row.fast_target_hours ?? 0),
    raw: row,
  };
}

/**
 * Fetches the merged protocol library: all quick plans + all fasting protocols,
 * with the client's currently-selected entry pinned to the front of the list.
 */
export function useProtocolLibrary(clientId: string | null | undefined) {
  return useQuery<LibraryResult>({
    queryKey: ["protocol-library", clientId],
    enabled: !!clientId,
    staleTime: 60_000,
    queryFn: async () => {
      const [quickRes, protoRes, settingsRes] = await Promise.all([
        supabase
          .from("quick_fasting_plans")
          .select("id, name, fast_hours, eat_hours, difficulty_group, order_index, min_level_required, description")
          .order("order_index", { ascending: true }),
        supabase
          .from("fasting_protocols")
          .select("id, name, category, description, duration_days, fast_target_hours, difficulty_level, min_level_required, plan_type, intensity_tier"),
        supabase
          .from("client_feature_settings")
          .select("selected_protocol_id, selected_quick_plan_id, current_level")
          .eq("client_id", clientId!)
          .maybeSingle(),
      ]);

      if (quickRes.error) throw quickRes.error;
      if (protoRes.error) throw protoRes.error;
      if (settingsRes.error) throw settingsRes.error;

      const currentLevel = settingsRes.data?.current_level ?? 1;
      const selectedQuickId = settingsRes.data?.selected_quick_plan_id ?? null;
      const selectedProtocolId = settingsRes.data?.selected_protocol_id ?? null;
      const selectedKey = selectedProtocolId
        ? `protocol:${selectedProtocolId}`
        : selectedQuickId
          ? `quick_plan:${selectedQuickId}`
          : null;

      const quickEntries = (quickRes.data ?? []).map(normalizeQuickPlan);
      const protocolEntries = (protoRes.data ?? []).map(normalizeProtocol);

      // Merged base order: quick plans (by order_index), then protocols (by level then hours).
      const merged = [...quickEntries, ...protocolEntries];

      // Pin the client's selected entry to the front, if present.
      const ordered = selectedKey
        ? [
            ...merged.filter((e) => e.key === selectedKey),
            ...merged.filter((e) => e.key !== selectedKey),
          ]
        : merged;

      return { entries: ordered, currentLevel, selectedKey };
    },
  });
}