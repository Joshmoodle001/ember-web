const allowedCalendarHosts = new Set(["calendar.google.com", "calendar.app.google"]);

function normalizeWorkspaceOrigin(value: string) {
  try {
    const url = new URL(value);
    const localDevelopment = process.env.NODE_ENV !== "production"
      && url.protocol === "http:"
      && ["localhost", "127.0.0.1"].includes(url.hostname);
    if ((!localDevelopment && url.protocol !== "https:") || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function isLocalDevelopmentOrigin(value: string) {
  try {
    const url = new URL(value);
    return process.env.NODE_ENV !== "production"
      && url.protocol === "http:"
      && ["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    return false;
  }
}

export function getWorkspaceSiteOrigin() {
  const configuredUrl = process.env.WORKSPACE_SITE_URL;
  if (!configuredUrl) return null;

  const origin = normalizeWorkspaceOrigin(configuredUrl);
  if (!origin) return null;
  const allowedOrigins = new Set(
    (process.env.WORKSPACE_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((value) => normalizeWorkspaceOrigin(value.trim()))
      .filter((value): value is string => value !== null),
  );
  if (!allowedOrigins.has(origin) && !isLocalDevelopmentOrigin(origin)) return null;
  return origin;
}

export function getCalendarBookingUrl() {
  const configuredUrl = process.env.GOOGLE_CALENDAR_BOOKING_URL;
  if (!configuredUrl) return null;

  try {
    const url = new URL(configuredUrl);
    if (url.protocol !== "https:" || !allowedCalendarHosts.has(url.hostname) || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}
