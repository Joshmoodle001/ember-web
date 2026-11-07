import type { ClientLoginCredentials, UsernameLoginIdentity } from "./username-login";

type Dependencies = {
  nodeEnv: string | undefined;
  readBody: (request: Request, maxBytes: number) => Promise<string>;
  checkRateLimits: (identifier: string, request: Request) => Promise<boolean>;
  checkCanonicalEmailRateLimit: (email: string) => Promise<boolean>;
  resolveUsername: (username: string) => Promise<UsernameLoginIdentity | null>;
  dummyAuthenticate: (password: string) => Promise<void>;
  authenticate: (credentials: { email: string; password: string }, expectedUserId: string | null) => Promise<"/admin" | "/account" | null>;
  isAllowedOrigin: (origin: string | null, nodeEnv: string | undefined) => boolean;
  parseCredentials: (body: string) => ClientLoginCredentials | null;
};

export async function handleClientLogin(request: Request, dependencies: Dependencies) {
  const failure = "Username, email or password is incorrect.";
  if (!dependencies.isAllowedOrigin(request.headers.get("origin"), dependencies.nodeEnv)) {
    return { status: 403, body: { error: "Sign-in could not be completed." } };
  }
  let credentials;
  try { credentials = dependencies.parseCredentials(await dependencies.readBody(request, 2_000)); }
  catch { return { status: 400, body: { error: "Please check your email or username and password." } }; }
  if (!credentials) return { status: 400, body: { error: "Please check your email or username and password." } };
  try {
    // Apply the input and IP limits before any username directory lookup.
    if (!await dependencies.checkRateLimits(credentials.identifier, request)) return { status: 429, body: { error: failure } };
    let email = credentials.identifier;
    let expectedUserId: string | null = null;
    if (credentials.kind === "username") {
      const identity = await dependencies.resolveUsername(credentials.identifier);
      if (!identity) {
        // Exercise the password provider without accepting any result, even on error.
        try { await dependencies.dummyAuthenticate(credentials.password); } catch { /* Generic denial below. */ }
        return { status: 401, body: { error: failure } };
      }
      email = identity.email;
      expectedUserId = identity.userId;
      // Exactly the same identity bucket as direct email login, without a second IP charge.
      if (!await dependencies.checkCanonicalEmailRateLimit(email)) return { status: 429, body: { error: failure } };
    }
    const destination = await dependencies.authenticate({ email, password: credentials.password }, expectedUserId);
    if (destination !== "/admin" && destination !== "/account") return { status: 401, body: { error: failure } };
    return { status: 200, body: { next: destination } };
  } catch {
    return { status: 503, body: { error: "Sign-in is temporarily unavailable. Please try again later." } };
  }
}
