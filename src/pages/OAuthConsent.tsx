import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Narrow local typing for the beta supabase.auth.oauth namespace so TS is happy.
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};
const oauth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      try {
        const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) return setError(error.message);
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(data);
      } catch (e: any) {
        setError(e?.message || "Failed to load authorization request");
      }
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      const { data, error } = approve
        ? await oauth.approveAuthorization(authorizationId)
        : await oauth.denyAuthorization(authorizationId);
      if (error) {
        setBusy(false);
        return setError(error.message);
      }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) {
        setBusy(false);
        return setError("No redirect returned by the authorization server.");
      }
      window.location.href = target;
    } catch (e: any) {
      setBusy(false);
      setError(e?.message || "Approve/deny failed");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-md w-full p-6 space-y-4">
        {error ? (
          <>
            <h1 className="text-xl font-semibold">Authorization error</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </>
        ) : !details ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <h1 className="text-xl font-semibold">
              Connect {details.client?.name ?? "an app"} to KSOM-360
            </h1>
            <p className="text-sm text-muted-foreground">
              This lets {details.client?.name ?? "the client"} act as you inside KSOM-360
              through the MCP server. You can revoke access anytime.
            </p>
            <div className="flex gap-2 pt-2">
              <Button disabled={busy} onClick={() => decide(true)} className="flex-1">
                Approve
              </Button>
              <Button
                disabled={busy}
                variant="outline"
                onClick={() => decide(false)}
                className="flex-1"
              >
                Deny
              </Button>
            </div>
          </>
        )}
      </Card>
    </main>
  );
}
