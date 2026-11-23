import { createServerClient } from "@supabase/ssr";
import { AuthSessionMissingError } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "./env";
import { ownsWorkspaceAccount, workspaceCookieOptions, workspaceSchema } from "./scope";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = getSupabasePublicConfig();

  const client = createServerClient(url, key, {
    db: { schema: workspaceSchema(url) },
    cookieOptions: workspaceCookieOptions(url),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies; proxy.ts refreshes the session.
        }
      },
    },
  });
  const getUser = client.auth.getUser.bind(client.auth);
  client.auth.getUser = async (jwt) => {
    const result = await getUser(jwt);
    if (result.data.user && !ownsWorkspaceAccount(result.data.user)) {
      return { data: { user: null }, error: new AuthSessionMissingError() };
    }
    return result;
  };
  return client;
}
