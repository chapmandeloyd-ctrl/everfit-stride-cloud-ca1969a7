import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClientHealthScore {
  clientId: string;
  streak: number;
  macroAdherence: number; // 0-100
  mealCompliance: number; // meals logged vs expected
  fastingConsistency: number; // 0-100
  ketoType: string | null;
  protocolName: string | null;
  fastingEnabled: boolean;
  todayCalories: number;
  targetCalories: number | null;
  todayProtein: number;
  targetProtein: number | null;
  mealsLoggedToday: number;
  lastActive: string | null;
}

export function useClientHealthScores(trainerId: string | undefined) {
  return useQuery({
    queryKey: ["client-health-scores", trainerId],
    queryFn: async () => {
      // 1. Get all clients
      const { data: clients } = await supabase
        .from("trainer_clients")
        .select("client_id")
        .eq("trainer_id", trainerId!)
        .eq("status", "active");

      if (!clients?.length) return {};

      const clientIds = clients.map(c => c.client_id);
      const today = new Date().toISOString().split("T")[0];

      // 2. Batch fetch all data in parallel
      const [settingsRes, ketoRes, macroRes, mealsRes, fastingRes, weeklyRes] = await Promise.all([
        supabase
          .from("client_feature_settings")
          .select("client_id, fasting_enabled, selected_protocol_id, fasting_protocols(name)")
          .in("client_id", clientIds),
        supabase
          .from("client_keto_assignments")
          .select("client_id, keto_types(abbreviation)")
          .in("client_id", clientIds)
          .eq("is_active", true),
        supabase
          .from("client_macro_targets")
          .select("client_id, target_calories, target_protein")
          .in("client_id", clientIds)
          .eq("is_active", true),
        supabase
          .from("client_meal_selections")
          .select("client_id, recipe_id, serving_multiplier, recipes(calories, protein)")
          .in("client_id", clientIds)
          .eq("meal_date", today),
        supabase
          .from("fasting_log")
          .select("client_id, actual_hours, target_hours, status, started_at")
          .in("client_id", clientIds)
          .order("started_at", { ascending: false })
          .limit(100),
        supabase
          .from("client_weekly_summaries" as any)
          .select("client_id, streak_days, macro_adherence_pct, fasting_adherence_pct, score_status")
          .in("client_id", clientIds)
          .order("week_start", { ascending: false })
          .limit(clientIds.length),
      ]);

      // Build lookup maps
      const settingsMap = new Map<string, any>();
      (settingsRes.data || []).forEach(s => settingsMap.set(s.client_id, s));

      const ketoMap = new Map<string, string>();
      (ketoRes.data || []).forEach((k: any) => ketoMap.set(k.client_id, k.keto_types?.abbreviation || null));

      const macroMap = new Map<string, any>();
      (macroRes.data || []).forEach(m => macroMap.set(m.client_id, m));

      // Meals by client
      const mealsByClient = new Map<string, { calories: number; protein: number; count: number }>();
      (mealsRes.data || []).forEach((sel: any) => {
        const existing = mealsByClient.get(sel.client_id) || { calories: 0, protein: 0, count: 0 };
        const mult = sel.serving_multiplier || 1;
        existing.calories += (sel.recipes?.calories || 0) * mult;
        existing.protein += (sel.recipes?.protein || 0) * mult;
        existing.count += 1;
        mealsByClient.set(sel.client_id, existing);
      });

      // Fasting consistency by client (last 7 fasts)
      const fastingByClient = new Map<string, number[]>();
      (fastingRes.data || []).forEach((f: any) => {
        const arr = fastingByClient.get(f.client_id) || [];
        if (arr.length < 7 && f.target_hours > 0) {
          arr.push(Math.min((f.actual_hours / f.target_hours) * 100, 100));
        }
        fastingByClient.set(f.client_id, arr);
      });

      // Weekly summaries
      const weeklyMap = new Map<string, any>();
      (weeklyRes.data || []).forEach((w: any) => {
        if (!weeklyMap.has(w.client_id)) weeklyMap.set(w.client_id, w);
      });

      // Build scores
      const scores: Record<string, ClientHealthScore> = {};
      for (const cid of clientIds) {
        const settings = settingsMap.get(cid);
        const macros = macroMap.get(cid);
        const meals = mealsByClient.get(cid) || { calories: 0, protein: 0, count: 0 };
        const weekly = weeklyMap.get(cid);
        const fastingRates = fastingByClient.get(cid) || [];

        const macroAdherence = weekly?.macro_adherence_pct ?? (
          macros?.target_calories && meals.calories > 0
            ? Math.min(Math.round((meals.calories / macros.target_calories) * 100), 100)
            : 0
        );

        const fastingConsistency = weekly?.fasting_adherence_pct ?? (
          fastingRates.length > 0
            ? Math.round(fastingRates.reduce((a: number, b: number) => a + b, 0) / fastingRates.length)
            : 0
        );

        scores[cid] = {
          clientId: cid,
          streak: weekly?.streak_days ?? 0,
          macroAdherence,
          mealCompliance: meals.count,
          fastingConsistency,
          ketoType: ketoMap.get(cid) || null,
          protocolName: (settings?.fasting_protocols as any)?.name || null,
          fastingEnabled: settings?.fasting_enabled ?? false,
          todayCalories: Math.round(meals.calories),
          targetCalories: macros?.target_calories || null,
          todayProtein: Math.round(meals.protein),
          targetProtein: macros?.target_protein || null,
          mealsLoggedToday: meals.count,
          lastActive: null,
        };
      }

      return scores;
    },
    enabled: !!trainerId,
    staleTime: 60000,
  });
}
