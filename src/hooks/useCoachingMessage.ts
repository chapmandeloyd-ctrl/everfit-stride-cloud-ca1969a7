import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";

export interface CoachingMessage {
  id: string;
  client_id: string;
  coach_type: string;
  message: string;
  action_text: string | null;
  priority: number;
  delivery_slot: string;
  is_read: boolean;
  message_date: string;
  daily_score: number | null;
  macro_adherence: number | null;
  fasting_adherence: number | null;
  streak: number | null;
  created_at: string;
}

export function useCoachingMessage() {
  const clientId = useEffectiveClientId();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];

  const query = useQuery({
    queryKey: ["coaching-message", clientId, today],
    queryFn: async () => {
      if (!clientId) return null;

      const { data, error } = await supabase
        .from("coaching_messages")
        .select("*")
        .eq("client_id", clientId)
        .eq("message_date", today)
        .order("priority", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as CoachingMessage | null;
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });

  // Trigger coaching engine to generate today's message
  const generateMessage = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("No client");
      const { data, error } = await supabase.functions.invoke("adaptive-coaching-engine", {
        body: { client_id: clientId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-message", clientId, today] });
    },
  });

  // Mark as read
  const markAsRead = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("coaching_messages")
        .update({ is_read: true })
        .eq("id", messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-message", clientId, today] });
    },
  });

  return {
    message: query.data,
    isLoading: query.isLoading,
    generateMessage,
    markAsRead,
  };
}
