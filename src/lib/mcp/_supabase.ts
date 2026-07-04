import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

declare const process: { env: Record<string, string | undefined> };

/**
 * Build a Supabase client that runs every query AS the signed-in MCP user.
 * The user's OAuth access token is forwarded via the Authorization header,
 * so all Row-Level Security policies evaluate against auth.uid() = that user.
 */
export function supabaseAsUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export function notAuthed() {
  return {
    content: [{ type: "text" as const, text: "Not authenticated" }],
    isError: true as const,
  };
}

export function errorResult(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true as const,
  };
}

export function jsonResult(payload: unknown, structuredKey?: string) {
  const text = JSON.stringify(payload, null, 2);
  return {
    content: [{ type: "text" as const, text }],
    structuredContent: structuredKey ? { [structuredKey]: payload } : (payload as any),
  };
}