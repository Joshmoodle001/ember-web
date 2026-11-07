import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getWorkspaceSiteOrigin } from "@/lib/public-links";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid proposal." }, { status: 400 });
  const siteOrigin = getWorkspaceSiteOrigin();
  if (!siteOrigin) return NextResponse.json({ error: "Workspace site URL is not configured." }, { status: 503 });

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await auth.supabase.rpc("issue_proposal_share", {
    p_proposal_id: id,
    p_token_hash: tokenHash,
  });

  if (error) {
    console.error("Proposal share failed:", error.code);
    return NextResponse.json({ error: "Proposal link could not be created." }, { status: 503 });
  }
  if (!data) return NextResponse.json({ error: "Only a draft or sent proposal can be shared." }, { status: 409 });

  return NextResponse.json({ url: new URL(`/proposal/${token}`, siteOrigin).toString() }, {
    headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
  });
}
