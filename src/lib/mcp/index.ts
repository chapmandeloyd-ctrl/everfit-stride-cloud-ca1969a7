import { auth, defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import whoamiTool from "./tools/whoami";

// Build the OAuth issuer from the Supabase project ref so the direct
// `<ref>.supabase.co` host is used (required by mcp-js issuer verification).
// Vite inlines VITE_SUPABASE_PROJECT_ID at build time; the fallback keeps the
// URL well-formed during the throwaway manifest-extract eval.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "ksom-360-mcp",
  title: "KSOM-360 MCP",
  version: "0.1.0",
  instructions:
    "Read-only starter tools for KSOM-360. Use `echo` to verify connectivity and `whoami` to confirm the signed-in coach or client.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [echoTool, whoamiTool],
});
