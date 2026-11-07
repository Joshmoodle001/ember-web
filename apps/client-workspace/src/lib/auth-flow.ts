export function getSafeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/admin";

  try {
    const base = "https://workspace.invalid";
    const url = new URL(value, base);
    if (url.origin !== base) return "/admin";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/admin";
  }
}

export function isSupportedEmailOtpType(value: string | null): value is "email" | "invite" {
  return value === "email" || value === "invite";
}

export type LegacyAuthFragment =
  | { kind: "session"; accessToken: string; refreshToken: string }
  | { kind: "error" }
  | { kind: "missing" };

export function parseLegacyAuthFragment(hash: string): LegacyAuthFragment {
  const fragment = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  if (fragment.has("error") || fragment.has("error_description")) return { kind: "error" };

  const accessToken = fragment.get("access_token");
  const refreshToken = fragment.get("refresh_token");
  if (!accessToken || !refreshToken) return { kind: "missing" };
  return { kind: "session", accessToken, refreshToken };
}

export function hasLegacyAuthFragment(hash: string) {
  const fragment = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  return ["access_token", "refresh_token", "error", "error_description"].some((key) => fragment.has(key));
}

type AuthErrorResult = { error: unknown | null };

export async function completeAuthCallback(
  auth: {
    exchangeCodeForSession: (code: string) => Promise<AuthErrorResult>;
    verifyOtp: (params: { token_hash: string; type: "email" | "invite" }) => Promise<AuthErrorResult>;
  },
  params: { code: string | null; tokenHash: string | null; type: string | null },
): Promise<"completed" | "invalid" | "legacy"> {
  if (params.code) {
    try {
      const { error } = await auth.exchangeCodeForSession(params.code);
      if (!error) return "completed";
    } catch {
      return "invalid";
    }
  }

  if (params.tokenHash && isSupportedEmailOtpType(params.type)) {
    try {
      const { error } = await auth.verifyOtp({ token_hash: params.tokenHash, type: params.type });
      return error ? "invalid" : "completed";
    } catch {
      return "invalid";
    }
  }

  return !params.code && !params.tokenHash ? "legacy" : "invalid";
}

export async function confirmLegacySession(
  auth: {
    setSession: (tokens: { access_token: string; refresh_token: string }) => Promise<AuthErrorResult>;
    getUser: () => Promise<{ data: { user: unknown | null }; error: unknown | null }>;
  },
  fragment: LegacyAuthFragment,
) {
  if (fragment.kind !== "session") return false;

  try {
    const { error: sessionError } = await auth.setSession({
      access_token: fragment.accessToken,
      refresh_token: fragment.refreshToken,
    });
    if (sessionError) return false;

    const { data, error: userError } = await auth.getUser();
    return !userError && Boolean(data.user);
  } catch {
    return false;
  }
}
