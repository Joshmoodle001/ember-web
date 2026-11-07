export type ClientLoginCredentials = {
  kind: "email" | "username";
  identifier: string;
  password: string;
};

export type UsernameLoginIdentity = { userId: string; email: string };
type AuthDirectoryUser = { id: string; email?: string | null; email_confirmed_at?: string | null };
type UsernameDirectory = {
  findUserId: (username: string) => Promise<string | null>;
  getUserById: (id: string) => Promise<AuthDirectoryUser | null>;
};

const usernamePattern = /^[a-z][a-z0-9._-]{2,31}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const userIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseClientLoginCredentials(rawBody: string): ClientLoginCredentials | null {
  let input: unknown;
  try { input = JSON.parse(rawBody); } catch { return null; }
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const body = input as Record<string, unknown>;
  if (Object.keys(body).some((key) => !["identifier", "email", "password"].includes(key))) return null;
  // Keep old email-only callers working, but never accept two competing identities.
  if (("identifier" in body) === ("email" in body)) return null;
  const value = "identifier" in body ? body.identifier : body.email;
  if (typeof value !== "string" || typeof body.password !== "string") return null;
  const identifier = value.trim().toLowerCase();
  const password = body.password;
  if (!identifier || identifier.length > 254 || !password.length || password.length > 1_024) return null;
  if (identifier.includes("@")) return emailPattern.test(identifier) ? { kind: "email", identifier, password } : null;
  if (!("identifier" in body) || !/^[A-Za-z][A-Za-z0-9._-]{2,31}$/.test(value.trim()) || !usernamePattern.test(identifier)) return null;
  return { kind: "username", identifier, password };
}

/** Called on the server after request rate limiting; no roles are stored in aliases. */
export async function resolveUsernameLogin(username: string, directory: UsernameDirectory): Promise<UsernameLoginIdentity | null> {
  if (!usernamePattern.test(username)) return null;
  const userId = await directory.findUserId(username);
  if (!userId || !userIdPattern.test(userId)) return null;
  const user = await directory.getUserById(userId);
  if (!user || user.id !== userId || !user.email_confirmed_at || typeof user.email !== "string") return null;
  const email = user.email.trim().toLowerCase();
  return email.length <= 254 && emailPattern.test(email) ? { userId, email } : null;
}

/** A changed/reassigned email must never turn one user's alias into another's login. */
export function matchesUsernameLoginIdentity(user: { id: string } | null, expectedUserId: string | null) {
  return Boolean(user && (!expectedUserId || user.id === expectedUserId));
}
