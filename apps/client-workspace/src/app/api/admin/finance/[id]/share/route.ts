import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getWorkspaceSiteOrigin } from "@/lib/public-links";

type RouteContext = { params: Promise<{ id: string }> };

const invoiceIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function noStoreJson(body: Record<string, string>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  if (!invoiceIdPattern.test(id)) return noStoreJson({ error: "Invalid invoice." }, 400);
  const siteOrigin = getWorkspaceSiteOrigin();
  if (!siteOrigin) return noStoreJson({ error: "Workspace site URL is not configured." }, 503);

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data: invoice, error: lookupError } = await auth.supabase.from("invoices")
    .select("status,share_token_hash")
    .eq("id", id)
    .maybeSingle();
  if (lookupError) {
    console.error("Invoice share lookup failed:", lookupError.code);
    return noStoreJson({ error: "Payment link could not be created." }, 503);
  }
  if (!invoice) return noStoreJson({ error: "Invoice not found." }, 404);
  if (!["draft", "sent", "overdue"].includes(invoice.status)) {
    return noStoreJson({ error: "Only unpaid invoices can have a payment link." }, 409);
  }

  const invoiceUpdate = {
    share_token_hash: tokenHash,
    updated_at: new Date().toISOString(),
    ...(invoice.status === "draft" ? { status: "sent" } : {}),
  };
  let invoiceUpdateQuery = auth.supabase.from("invoices")
    .update(invoiceUpdate)
    .eq("id", id)
    .eq("status", invoice.status);
  invoiceUpdateQuery = invoice.share_token_hash === null
    ? invoiceUpdateQuery.is("share_token_hash", null)
    : invoiceUpdateQuery.eq("share_token_hash", invoice.share_token_hash);
  const { data, error } = await invoiceUpdateQuery.select("id").maybeSingle();

  if (error) {
    console.error("Invoice share failed:", error.code);
    return noStoreJson({ error: "Payment link could not be created." }, 503);
  }
  if (!data) return noStoreJson({ error: "The invoice changed while the link was being updated. Please try again." }, 409);

  return noStoreJson({ url: new URL(`/pay/${token}`, siteOrigin).toString() });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  if (!invoiceIdPattern.test(id)) return noStoreJson({ error: "Invalid invoice." }, 400);

  // Revoke only the bearer credential. Preserve amounts, status and in-flight ITNs.
  const { data, error } = await auth.supabase.from("invoices")
    .update({ share_token_hash: null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Invoice link revocation failed:", error.code);
    return noStoreJson({ error: "The invoice link could not be revoked. Please try again." }, 503);
  }
  if (!data) return noStoreJson({ error: "Invoice not found." }, 404);
  return noStoreJson({ message: "Private invoice link revoked." });
}
