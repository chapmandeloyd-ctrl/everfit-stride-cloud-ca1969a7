import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle, MailX } from "lucide-react";
import { Button } from "@/components/ui/button";

type UnsubState = "loading" | "valid" | "already" | "invalid" | "success" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<UnsubState>("loading");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }

    const validate = async () => {
      try {
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
        );
        const data = await resp.json();
        if (!resp.ok) {
          setState("invalid");
        } else if (data.valid === false && data.reason === "already_unsubscribed") {
          setState("already");
        } else if (data.valid) {
          setState("valid");
        } else {
          setState("invalid");
        }
      } catch {
        setState("invalid");
      }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    setState("loading");
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) {
        setState("error");
      } else if (data?.success) {
        setState("success");
      } else if (data?.reason === "already_unsubscribed") {
        setState("already");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <img
          src="/logo.png"
          alt="KSOM360"
          className="h-20 w-20 mx-auto"
        />

        {state === "loading" && (
          <div className="space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Processing…</p>
          </div>
        )}

        {state === "valid" && (
          <div className="space-y-4">
            <MailX className="h-12 w-12 mx-auto text-muted-foreground" />
            <h1 className="text-2xl font-bold">Unsubscribe</h1>
            <p className="text-muted-foreground">
              Are you sure you want to unsubscribe from KSOM360 emails?
            </p>
            <Button
              onClick={handleUnsubscribe}
              variant="destructive"
              size="lg"
              className="w-full"
            >
              Confirm Unsubscribe
            </Button>
          </div>
        )}

        {state === "success" && (
          <div className="space-y-3">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
            <h1 className="text-2xl font-bold">You're unsubscribed</h1>
            <p className="text-muted-foreground">
              You won't receive any more emails from KSOM360.
            </p>
          </div>
        )}

        {state === "already" && (
          <div className="space-y-3">
            <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground" />
            <h1 className="text-2xl font-bold">Already unsubscribed</h1>
            <p className="text-muted-foreground">
              You've already unsubscribed from KSOM360 emails.
            </p>
          </div>
        )}

        {state === "invalid" && (
          <div className="space-y-3">
            <XCircle className="h-12 w-12 mx-auto text-destructive" />
            <h1 className="text-2xl font-bold">Invalid link</h1>
            <p className="text-muted-foreground">
              This unsubscribe link is invalid or has expired.
            </p>
          </div>
        )}

        {state === "error" && (
          <div className="space-y-3">
            <XCircle className="h-12 w-12 mx-auto text-destructive" />
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-muted-foreground">
              Please try again later or contact support.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
