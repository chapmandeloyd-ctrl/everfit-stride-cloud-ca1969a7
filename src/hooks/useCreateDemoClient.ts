import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type EngineMode = Database["public"]["Enums"]["engine_mode"];

export function useCreateDemoClient() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (engine: EngineMode) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Create a demo client profile
      const demoEmail = `demo-${Date.now()}@ksom360.local`;
      const { data: client, error } = await supabase
        .from("profiles")
        .insert({
          id: crypto.randomUUID(),
          email: demoEmail,
          full_name: `Demo Client (${engine})`,
          role: "client",
        })
        .select()
        .single();

      if (error) throw error;

      // Create feature settings with the chosen engine
      await supabase.from("client_feature_settings").insert({
        client_id: client.id,
        trainer_id: user.id,
        engine_mode: engine,
      });

      return { client };
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create demo client");
    },
  });
}
