// Shared Paddle utilities for edge functions.
// Uses the Lovable connector gateway so we don't need to manage Paddle API keys directly.

export type PaddleEnv = "sandbox" | "live";

const GATEWAY_BASE = "https://api.lovable.app/connector-gateway/paddle";

function getKeys(env: PaddleEnv) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const connectionKey =
    env === "sandbox"
      ? Deno.env.get("PADDLE_SANDBOX_API_KEY")
      : Deno.env.get("PADDLE_LIVE_API_KEY");

  if (!lovableKey) throw new Error("Missing LOVABLE_API_KEY");
  if (!connectionKey) throw new Error(`Missing Paddle ${env} API key`);

  return { lovableKey, connectionKey };
}

export async function gatewayFetch(
  env: PaddleEnv,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const { lovableKey, connectionKey } = getKeys(env);
  const url = `${GATEWAY_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(init.headers);
  headers.set("Lovable-API-Key", lovableKey);
  headers.set("X-Connection-Api-Key", connectionKey);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, { ...init, headers });
}
