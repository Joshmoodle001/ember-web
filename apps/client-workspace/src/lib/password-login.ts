export const passwordLoginNextPath = "/admin" as const;
export const passwordLoginBodyLimit = 2_000;
export const passwordLoginFailureMessage = "Email or password is incorrect.";

const canonicalOrigins = new Set([
  "https://emberweb.co.za",
  "https://www.emberweb.co.za",
  "https://portal.emberweb.co.za",
]);

export type PasswordCredentials = { email: string; password: string };

export type PasswordLoginOutcome = {
  status: number;
  body: { next: typeof passwordLoginNextPath } | { error: string };
};

type PasswordAuthAttempt = {
  userEmail: string | null;
  error: unknown | null;
  signOut: () => Promise<void>;
};

export type PasswordLoginDependencies = {
  nodeEnv: string | undefined;
  readBody: (request: Request, maxBytes: number) => Promise<string>;
  isBodyTooLarge: (error: unknown) => boolean;
  getClientIp: (headers: Headers) => string | null;
  checkRateLimits: (email: string, ip: string) => Promise<boolean>;
  authenticate: (credentials: PasswordCredentials) => Promise<PasswordAuthAttempt>;
  isAdminEmail: (email: string) => boolean;
};

function outcome(status: number, body: PasswordLoginOutcome["body"]): PasswordLoginOutcome {
  return { status, body };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isAllowedPasswordLoginOrigin(origin: string | null, nodeEnv: string | undefined) {
  if (!origin) return false;
  if (canonicalOrigins.has(origin)) return true;
  if (nodeEnv !== "development") return false;

  try {
    const url = new URL(origin);
    return url.origin === origin
      && url.protocol === "http:"
      && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

export function parsePasswordCredentials(rawBody: string): PasswordCredentials | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody) as unknown;
  } catch {
    return null;
  }
  if (!isRecord(parsed) || Object.keys(parsed).some((key) => key !== "email" && key !== "password")) return null;

  const email = typeof parsed.email === "string" ? parsed.email.trim().toLowerCase() : "";
  const password = typeof parsed.password === "string" ? parsed.password : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length === 0 || password.length > 1_024) {
    return null;
  }
  return { email, password };
}

export async function handlePasswordLogin(request: Request, dependencies: PasswordLoginDependencies): Promise<PasswordLoginOutcome> {
  if (!isAllowedPasswordLoginOrigin(request.headers.get("origin"), dependencies.nodeEnv)) {
    return outcome(403, { error: "Sign-in could not be completed." });
  }

  let rawBody: string;
  try {
    rawBody = await dependencies.readBody(request, passwordLoginBodyLimit);
  } catch (error) {
    return dependencies.isBodyTooLarge(error)
      ? outcome(413, { error: "Please check your email and password." })
      : outcome(400, { error: "Please enter a valid email and password." });
  }

  const credentials = parsePasswordCredentials(rawBody);
  if (!credentials) return outcome(400, { error: "Please enter a valid email and password." });

  // Use a shared fallback bucket when the platform provides no client IP, rather than disabling
  // the IP limit. The email limit is always checked as well, before any account allowlist check.
  const ip = dependencies.getClientIp(request.headers) ?? "unknown";
  try {
    if (!await dependencies.checkRateLimits(credentials.email, ip)) {
      return outcome(429, { error: passwordLoginFailureMessage });
    }

    const attempt = await dependencies.authenticate(credentials);
    if (attempt.error || !attempt.userEmail) return outcome(401, { error: passwordLoginFailureMessage });

    const authenticatedEmail = attempt.userEmail.trim().toLowerCase();
    if (!dependencies.isAdminEmail(authenticatedEmail)) {
      try {
        await attempt.signOut();
      } catch {
        // Keep the denial response generic even if Supabase cannot clear a stale session.
      }
      return outcome(401, { error: passwordLoginFailureMessage });
    }

    return outcome(200, { next: passwordLoginNextPath });
  } catch {
    return outcome(503, { error: "Sign-in is temporarily unavailable. Please try again later." });
  }
}
