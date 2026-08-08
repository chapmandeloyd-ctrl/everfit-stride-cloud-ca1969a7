import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  fullName: string;
  loginLink: string;
  loginUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, loginLink, loginUrl }: WelcomeEmailRequest = await req.json();

    console.log("Sending welcome email to:", email);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error: sendError } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "client-welcome",
        recipientEmail: email,
        idempotencyKey: `client-welcome-${email}-${new Date().toISOString().slice(0, 10)}`,
        templateData: {
          fullName,
          email,
          loginLink: loginLink || loginUrl || "https://apexbeast-if.app/auth",
        },
      },
    });

    if (sendError) {
      throw new Error(sendError.message || "Failed to send welcome email");
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
