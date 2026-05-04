import { NextRequest, NextResponse } from "next/server";

// Simple auth placeholder – replace with real auth logic
async function verifyAuth(request: NextRequest): Promise<boolean> {
  const auth = request.headers.get("authorization");
  return !!auth;
}

// In‑memory data store for outreach contacts (replace with DB later)
const outreachData = [
  { id: "1", name: "Sarah Johnson", email: "sarah@techcorp.com", company: "TechCorp Inc", status: "new", source: "LinkedIn", notes: "Interested in web development services", createdAt: "2025-01-15" },
  { id: "2", name: "Michael Chen", email: "m.chen@innovate.io", company: "Innovate.io", status: "contacted", source: "Referral", notes: "Follow up next week", createdAt: "2025-01-12" },
  { id: "3", name: "Emma Williams", email: "emma@startup.co", company: "StartupCo", status: "qualified", source: "Website", notes: "High potential client", createdAt: "2025-01-10" },
  { id: "4", name: "David Brown", email: "david@enterprise.com", company: "Enterprise Ltd", status: "new", source: "Cold Email", notes: "Looking for AI integration", createdAt: "2025-01-18" },
  { id: "5", name: "Lisa Anderson", email: "lisa@agency.net", company: "Creative Agency", status: "converted", source: "LinkedIn", notes: "Signed contract for website redesign", createdAt: "2025-01-08" },
];

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const source = searchParams.get("source");
  let result = outreachData;
  if (status && status !== "all") result = result.filter((c) => c.status === status);
  if (source && source !== "all") result = result.filter((c) => c.source === source);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const newContact = {
    id: String(outreachData.length + 1),
    ...body,
    createdAt: new Date().toISOString().split("T")[0],
  };
  outreachData.push(newContact);
  return NextResponse.json(newContact, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const index = outreachData.findIndex((c) => c.id === body.id);
  if (index === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  outreachData[index] = { ...outreachData[index], ...body };
  return NextResponse.json(outreachData[index]);
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const index = outreachData.findIndex((c) => c.id === id);
  if (index === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  outreachData.splice(index, 1);
  return NextResponse.json({ message: "Deleted" });
}
