import { useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Trainer-controlled PDF export branding.
 *
 * - Trainers: read & write their own row.
 * - Clients: read their assigned trainer's row (RLS handles it). Pass the
 *   trainer's user id to `useClientTrainerPdfBranding` from the client side.
 *
 * Defaults match the legacy hard-coded look so existing exports never regress.
 */
export interface TrainerPdfBranding {
  show_logo: boolean;
  accent_color: string;
  footer_text: string | null;
  document_label_override: string | null;
}

export const DEFAULT_PDF_BRANDING: TrainerPdfBranding = {
  show_logo: true,
  accent_color: "#CC181E",
  footer_text: null,
  document_label_override: null,
};

const QUERY_KEY = "trainer-pdf-branding";

/** Trainer-side: read + mutate their own branding row. */
export function useTrainerPdfBranding() {
  const { user } = useAuth();
  const trainerId = user?.id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: [QUERY_KEY, trainerId],
    enabled: !!trainerId,
    queryFn: async (): Promise<TrainerPdfBranding> => {
      const { data, error } = await supabase
        .from("trainer_pdf_branding")
        .select("show_logo, accent_color, footer_text, document_label_override")
        .eq("trainer_id", trainerId!)
        .maybeSingle();
      if (error) throw error;
      return data ?? DEFAULT_PDF_BRANDING;
    },
  });

  const save = useMutation({
    mutationFn: async (next: TrainerPdfBranding) => {
      if (!trainerId) throw new Error("Not signed in");
      const { error } = await supabase
        .from("trainer_pdf_branding")
        .upsert(
          { trainer_id: trainerId, ...next },
          { onConflict: "trainer_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY, trainerId] });
    },
  });

  return {
    branding: query.data ?? DEFAULT_PDF_BRANDING,
    isLoading: query.isLoading,
    save,
  };
}

/**
 * Client-side: read the branding row of the trainer assigned to the
 * current client. Returns defaults if no trainer is configured yet so
 * exports always produce a clean document.
 */
export function useClientPdfBranding() {
  const { user } = useAuth();
  const clientId = user?.id;

  const query = useQuery({
    queryKey: [QUERY_KEY, "for-client", clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<TrainerPdfBranding> => {
      // Look up the client's assigned trainer first.
      const { data: cfs, error: cfsErr } = await supabase
        .from("client_feature_settings")
        .select("trainer_id")
        .eq("client_id", clientId!)
        .maybeSingle();
      if (cfsErr) throw cfsErr;
      const trainerId = cfs?.trainer_id;
      if (!trainerId) return DEFAULT_PDF_BRANDING;

      const { data, error } = await supabase
        .from("trainer_pdf_branding")
        .select("show_logo, accent_color, footer_text, document_label_override")
        .eq("trainer_id", trainerId)
        .maybeSingle();
      if (error) throw error;
      return data ?? DEFAULT_PDF_BRANDING;
    },
  });

  return {
    branding: query.data ?? DEFAULT_PDF_BRANDING,
    isLoading: query.isLoading,
  };
}
