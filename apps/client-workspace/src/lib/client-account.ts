export function safeClientResourceUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 2000) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes(".") || url.hostname === "localhost" || url.hostname.endsWith(".local") || /^\d+(\.\d+){3}$/.test(url.hostname) || url.hostname.includes(":")) return null;
    return url.href;
  } catch { return null; }
}

export const clientResourceKinds = new Set(["website", "app", "feature", "document"]);
export function clientRegistrationOrigin(origin: string | null, nodeEnv: string | undefined) {
  if (origin === "https://emberweb.co.za") return origin;
  if (nodeEnv !== "development" || !origin) return null;
  try {
    const url = new URL(origin);
    return url.origin === origin && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname) ? origin : null;
  } catch { return null; }
}
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
