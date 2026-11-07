export type DashboardDestination = "/admin" | "/account";

type VerifiedIdentity = { email?: string | null; email_confirmed_at?: string | null };

// Identity must come from Supabase authentication, never submitted role metadata.
export function dashboardDestination(user: VerifiedIdentity | null, adminEmails: readonly string[]): DashboardDestination | null {
  if (!user?.email || !user.email_confirmed_at) return null;
  const email = user.email.trim().toLowerCase();
  return adminEmails.some((approved) => approved.trim().toLowerCase() === email) ? "/admin" : "/account";
}

export function legacyClientLoginPath(params: { error?: string | string[]; register?: string | string[] }) {
  const query = new URLSearchParams();
  if (typeof params.error === "string" && params.error) query.set("error", "link");
  if (params.register === "1") query.set("register", "1");
  return query.size ? `/login?${query.toString()}` : "/login";
}
