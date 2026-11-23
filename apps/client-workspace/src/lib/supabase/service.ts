import { createClient } from "@supabase/supabase-js";
import { isSharedWorkspace, workspaceBroker, workspaceSchema } from "./scope";

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url && isSharedWorkspace(url)) {
    const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!publishable) throw new Error("The workspace publishable key is missing.");
    return createClient(url, publishable, {
      db: { schema: workspaceSchema(url) },
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: (input, init) => {
        const request = new URL(String(input));
        if (request.origin !== url || !request.pathname.startsWith("/rest/v1/")) throw new Error("Unsupported shared-workspace operation.");
        return workspaceBroker("db/" + request.pathname.slice("/rest/v1/".length) + request.search, init);
      } },
    });
  }
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server-side Supabase secret key is not configured.");
  return createClient(url, key, { db: { schema: workspaceSchema(url) }, auth: { autoRefreshToken: false, persistSession: false } });
}
