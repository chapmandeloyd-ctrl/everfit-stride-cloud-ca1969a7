import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResendEmailRequest {
  clientId: string;
  loginUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authenticated trainer
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify the trainer is authenticated
    const {
      data: { user: trainer },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !trainer) {
      throw new Error("Unauthorized");
    }

    const { clientId }: ResendEmailRequest = await req.json();

    // Always force production URL — never trust client-provided URLs
    // (could be Lovable editor or preview origin).
    const loginUrl = "https://apexbeast-if.app/auth";

    console.log("Resending welcome email for client:", clientId);

    // Get client details
    const { data: clientProfile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("email, full_name")
      .eq("id", clientId)
      .single();

    if (profileError || !clientProfile) {
      throw new Error("Client not found");
    }

    // Verify trainer-client relationship
    const { data: relationship, error: relationError } = await supabaseClient
      .from("trainer_clients")
      .select("id")
      .eq("trainer_id", trainer.id)
      .eq("client_id", clientId)
      .single();

    if (relationError || !relationship) {
      throw new Error("Client not found or unauthorized");
    }

    console.log("Sending welcome email to:", clientProfile.email);

    const { error: sendError } = await supabaseClient.functions.invoke("send-transactional-email", {
      body: {
        templateName: "client-welcome",
        recipientEmail: clientProfile.email,
        idempotencyKey: `client-welcome-resend-${clientId}-${Date.now()}`,
        templateData: {
          fullName: clientProfile.full_name,
          email: clientProfile.email,
          loginLink: loginUrl,
        },
      },
    });

    if (sendError) {
      throw new Error(sendError.message || "Failed to send welcome email");
    }

    console.log("Welcome email queued for:", clientProfile.email);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Welcome email sent successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in resend-client-welcome-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
