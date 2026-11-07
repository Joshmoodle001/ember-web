import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: { inquiryId?: unknown };
  try {
    body = (await request.json()) as { inquiryId?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid inquiry." }, { status: 400 });
  }
  if (typeof body.inquiryId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.inquiryId)) {
    return NextResponse.json({ error: "Choose a valid inquiry." }, { status: 400 });
  }

  const { data, error } = await auth.supabase.rpc("convert_inquiry_to_client", { p_inquiry_id: body.inquiryId });
  if (error) {
    console.error("Inquiry conversion failed:", error.code);
    return NextResponse.json({ error: "Move the inquiry to Proposal or Won before creating a client." }, { status: 409 });
  }
  return NextResponse.json({ clientId: data });
}
