const staffOrigins = new Set(["https://emberweb.co.za", "https://www.emberweb.co.za", "https://portal.emberweb.co.za"]);

export function hasAllowedStaffOrigin(request: Request, requireOrigin = false) {
  const origin = request.headers.get("origin");
  if (!origin) return !requireOrigin;
  if (process.env.VERCEL_ENV === "preview") {
    return Boolean(process.env.EMBERWEB_PREVIEW_SUPABASE_HOST) && origin === new URL(request.url).origin;
  }
  if (staffOrigins.has(origin)) return true;
  if (process.env.NODE_ENV === "production") return false;
  try {
    const url = new URL(origin);
    return url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname) && url.origin === new URL(request.url).origin;
  } catch { return false; }
}
