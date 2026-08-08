import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GuardianInviteRequest {
  guardianEmail: string;
  athleteName: string;
  token: string;
  appUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { guardianEmail, athleteName, token, appUrl }: GuardianInviteRequest = await req.json();

    const viewUrl = `${appUrl}/guardian/${token}`;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error: sendError } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "guardian-invite",
        recipientEmail: guardianEmail,
        idempotencyKey: `guardian-invite-${token}`,
        templateData: { athleteName, viewUrl },
      },
    });

    if (sendError) {
      throw new Error(sendError.message || "Failed to send guardian invite");
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending guardian invite:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
