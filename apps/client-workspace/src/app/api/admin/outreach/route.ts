import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { hasAllowedStaffOrigin } from "@/lib/staff-origin";
import { readLimitedText, RequestBodyTooLargeError } from "@/lib/request-body";

const table = "outreach_prospects";
const fields = [
  "business_name", "industry", "city", "website", "phone", "email", "notes",
  "permission_status", "permission_note", "status", "product_key",
] as const;
const stringFields = ["business_name", "industry", "city", "website", "phone", "email", "notes", "permission_note"] as const;
const permissionStatuses = new Set(["unconfirmed", "opted_in", "existing_customer", "do_not_contact"]);
const prospectStatuses = new Set(["research", "ready", "contacted", "replied", "booked", "closed"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const maxLength: Record<(typeof stringFields)[number], number> = {
  business_name: 180,
  industry: 100,
  city: 120,
  website: 2048,
  phone: 60,
  email: 254,
  notes: 4000,
  permission_note: 1000,
};

type FieldValues = Record<string, string>;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}


function missingTable(code: string | undefined) {
  return code === "42P01" || code === "PGRST205";
}

async function parseBody(request: NextRequest): Promise<{ body?: Record<string, unknown>; error?: "too_large" | "invalid" }> {
  try {
    const raw = await readLimitedText(request, 12_000);
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? { body: parsed } : { error: "invalid" };
  } catch (error) {
    return { error: error instanceof RequestBodyTooLargeError ? "too_large" : "invalid" };
  }
}

function checkKeys(body: Record<string, unknown>, allowed: readonly string[]) {
  const allowedSet = new Set(allowed);
  return Object.keys(body).every((key) => allowedSet.has(key));
}

function sanitizeWebsite(value: string) {
  if (!value) return "";
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    if (!(["https:", "http:"].includes(url.protocol)) || !url.hostname || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1" || host === "[::1]") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function parseFields(body: Record<string, unknown>, partial: boolean): { values?: FieldValues; error?: string } {
  const allowedKeys = [...fields, ...(partial ? ["id"] : [])];
  if (!checkKeys(body, allowedKeys)) return { error: "Only prospect fields can be saved." };

  const values: FieldValues = {};
  if (!partial || Object.hasOwn(body, "product_key")) {
    const product = Object.hasOwn(body, "product_key") ? body.product_key : "emberweb";
    if (product !== "emberweb" && product !== "biosync") return { error: "Choose EmberWeb or BioSync." };
    values.product_key = product;
  }
  for (const key of stringFields) {
    if (partial && !Object.hasOwn(body, key)) continue;
    const value = partial ? body[key] : (body[key] ?? "");
    if (typeof value !== "string") return { error: "Check the prospect details and try again." };
    const clean = value.trim();
    if (clean.length > maxLength[key]) return { error: "One or more prospect details are too long." };
    if (key === "business_name" && clean.length < 2) return { error: "Business name must be at least 2 characters." };
    if (key === "email" && clean && !emailPattern.test(clean)) return { error: "Enter a valid email address or leave it blank." };
    if (key === "website") {
      const safeWebsite = sanitizeWebsite(clean);
      if (safeWebsite === null) return { error: "Website must be a valid HTTP or HTTPS address." };
      values[key] = safeWebsite;
    } else {
      values[key] = key === "email" ? clean.toLowerCase() : clean;
    }
  }

  if (!partial || Object.hasOwn(body, "permission_status")) {
    const status = partial ? body.permission_status : (body.permission_status ?? "unconfirmed");
    if (typeof status !== "string" || !permissionStatuses.has(status)) return { error: "Choose a valid permission status." };
    values.permission_status = status;
  }
  if (!partial || Object.hasOwn(body, "status")) {
    const status = partial ? body.status : (body.status ?? "research");
    if (typeof status !== "string" || !prospectStatuses.has(status)) return { error: "Choose a valid outreach status." };
    values.status = status;
  }

  const permissionStatus = values.permission_status;
  if (typeof permissionStatus === "string" && ["opted_in", "existing_customer"].includes(permissionStatus)) {
    const permissionNote = values.permission_note;
    if (typeof permissionNote !== "string" || permissionNote.trim().length < 10) {
      return { error: "Record how permission was obtained before marking this prospect opted in." };
    }
  }

  return { values };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from(table)
    .select("id,business_name,industry,product_key,city,website,phone,email,notes,permission_status,permission_note,status,created_at,updated_at")
    .order("updated_at", { ascending: false })
    .limit(250);

  if (error) {
    if (missingTable(error.code)) return json({ error: "Outreach storage is not ready. Apply the outreach prospects migration.", setupRequired: true }, 503);
    console.error("Outreach prospects could not be loaded:", error.code);
    return json({ error: "Outreach prospects could not be loaded." }, 503);
  }

  const preparations = await auth.supabase.from("outreach_preparations").select("prospect_id,message,prepared_at,source_updated_at").limit(1000);
  if (preparations.error) return json({ error: "Outreach preparation storage is not ready." }, 503);
  return json({ prospects: data, preparations: preparations.data, lookupConfigured: Boolean(process.env.GOOGLE_PLACES_API_KEY?.trim()) });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  if (!hasAllowedStaffOrigin(request)) return json({ error: "Request origin is not allowed." }, 403);

  const parsed = await parseBody(request);
  if (!parsed.body) return json({ error: parsed.error === "too_large" ? "Prospect details are too large." : "Invalid prospect details." }, parsed.error === "too_large" ? 413 : 400);
  const parsedFields = parseFields(parsed.body, false);
  if (!parsedFields.values) return json({ error: parsedFields.error ?? "Invalid prospect details." }, 400);

  const { data, error } = await auth.supabase
    .from(table)
    .insert(parsedFields.values)
    .select("id,business_name,industry,product_key,city,website,phone,email,notes,permission_status,permission_note,status,created_at,updated_at")
    .single();
  if (error) {
    if (missingTable(error.code)) return json({ error: "Outreach storage is not ready. Apply the outreach prospects migration.", setupRequired: true }, 503);
    console.error("Outreach prospect could not be saved:", error.code);
    return json({ error: error.code === "23514" ? "Check the permission status and supporting note." : "Prospect could not be saved." }, error.code === "23514" ? 400 : 503);
  }
  return json({ prospect: data }, 201);
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  if (!hasAllowedStaffOrigin(request)) return json({ error: "Request origin is not allowed." }, 403);

  const parsed = await parseBody(request);
  if (!parsed.body) return json({ error: parsed.error === "too_large" ? "Prospect details are too large." : "Invalid prospect details." }, parsed.error === "too_large" ? 413 : 400);
  if (typeof parsed.body.id !== "string" || !uuidPattern.test(parsed.body.id)) return json({ error: "Choose a valid prospect." }, 400);
  const parsedFields = parseFields(parsed.body, true);
  if (!parsedFields.values || Object.keys(parsedFields.values).length === 0) return json({ error: parsedFields.error ?? "Choose at least one prospect field to update." }, 400);

  const { data, error } = await auth.supabase
    .from(table)
    .update({ ...parsedFields.values, updated_at: new Date().toISOString() })
    .eq("id", parsed.body.id.toLowerCase())
    .select("id,business_name,industry,product_key,city,website,phone,email,notes,permission_status,permission_note,status,created_at,updated_at")
    .maybeSingle();
  if (error) {
    if (missingTable(error.code)) return json({ error: "Outreach storage is not ready. Apply the outreach prospects migration.", setupRequired: true }, 503);
    console.error("Outreach prospect could not be updated:", error.code);
    return json({ error: error.code === "23514" ? "Check the permission status and supporting note." : "Prospect could not be updated." }, error.code === "23514" ? 400 : 503);
  }
  if (!data) return json({ error: "Prospect not found." }, 404);
  return json({ prospect: data });
}
