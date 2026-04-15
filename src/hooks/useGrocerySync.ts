import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCallback } from "react";

export function useGrocerySync() {
  const { toast } = useToast();

  const syncMealLog = useCallback(async (clientId: string, recipeId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("grocery-sync", {
        body: { client_id: clientId, recipe_id: recipeId, action: "log_meal" },
      });

      if (error) throw error;

      if (data?.synced) {
        if (data.low_stock?.length > 0) {
          toast({
            title: "🛒 Running low!",
            description: `You're running low on: ${data.low_stock.join(", ")}`,
            variant: "destructive",
          });
        }
        if (data.auto_added?.length > 0) {
          toast({
            title: "🛒 Grocery list updated",
            description: `${data.auto_added.length} new items added from logged meal`,
          });
        }
      }

      return data;
    } catch (e) {
      console.error("Grocery sync failed:", e);
      return null;
    }
  }, [toast]);

  return { syncMealLog };
}
