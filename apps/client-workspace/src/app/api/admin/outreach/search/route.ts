import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { hasAllowedStaffOrigin } from "@/lib/staff-origin";
import { readLimitedText, RequestBodyTooLargeError } from "@/lib/request-body";
import { checkRateLimits } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/service";
import { isGooglePlacesConfigured, searchGooglePlaces } from "@/lib/google-places";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}


function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  if (!hasAllowedStaffOrigin(request)) return json({ error: "Request origin is not allowed." }, 403);
  if (!isGooglePlacesConfigured()) return json({ error: "Google Places lookup is not configured." }, 503);

  let parsed: unknown;
  try {
    const raw = await readLimitedText(request, 12_000);
    parsed = JSON.parse(raw);
  } catch (error) {
    return json({ error: error instanceof RequestBodyTooLargeError ? "Search details are too large." : "Invalid search details." }, error instanceof RequestBodyTooLargeError ? 413 : 400);
  }
  if (!isRecord(parsed) || Object.keys(parsed).some((key) => !["query", "city"].includes(key))) return json({ error: "Invalid search details." }, 400);

  const query = typeof parsed.query === "string" ? parsed.query.trim().replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ") : "";
  const city = parsed.city === undefined || parsed.city === "" ? "" : typeof parsed.city === "string" ? parsed.city.trim().replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ") : null;
  if (query.length < 2 || query.length > 120 || city === null || city.length > 120 || (city && city.length < 2)) {
    return json({ error: "Enter a business type or name and an optional city." }, 400);
  }

  try {
    const serviceClient = createServiceClient();
    const allowed = await checkRateLimits(serviceClient, [
      { scope: "google-places:admin-user", identity: auth.user.id, limit: 10, windowSeconds: 3600 },
    ]);
    if (!allowed) return json({ error: "Lookup limit reached. Try again later." }, 429);

    const results = await searchGooglePlaces(query, city || undefined);
    return json({ results });
  } catch {
    return json({ error: "Google Places lookup is temporarily unavailable." }, 503);
  }
}
