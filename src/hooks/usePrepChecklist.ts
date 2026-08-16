import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Prep-runway checklist state.
 *
 * Source of truth is the `prep_checklist_state` table (so completions follow the
 * client across devices). localStorage is kept as an instant-read mirror and as a
 * fallback when the table isn't reachable.
 */
export function usePrepChecklist(clientId: string | null | undefined, key: string) {
  const [checked, setChecked] = useState<string[]>([]);

  // Instant read from the local mirror so the UI never flashes empty.
  useEffect(() => {
    if (!key || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(key);
      setChecked(raw ? JSON.parse(raw) : []);
    } catch {
      setChecked([]);
    }
  }, [key]);

  // Then reconcile with the server copy.
  useEffect(() => {
    if (!key || !clientId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("prep_checklist_state")
        .select("checked_items")
        .eq("client_id", clientId)
        .eq("checklist_key", key)
        .maybeSingle();
      if (cancelled || error || !data) return;
      const items: string[] = Array.isArray(data.checked_items) ? data.checked_items : [];
      setChecked(items);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(items));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key, clientId]);

  const toggle = useCallback(
    (id: string) => {
      setChecked((prev) => {
        const nextVal = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
        if (key && typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(nextVal));
        }
        if (key && clientId) {
          void (supabase as any)
            .from("prep_checklist_state")
            .upsert(
              {
                client_id: clientId,
                checklist_key: key,
                checked_items: nextVal,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "client_id,checklist_key" },
            );
        }
        return nextVal;
      });
    },
    [key, clientId],
  );

  return { checked, toggle };
}
