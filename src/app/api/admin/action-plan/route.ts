import { NextRequest, NextResponse } from "next/server";

async function verifyAuth(request: NextRequest): Promise<boolean> {
  const auth = request.headers.get("authorization");
  return !!auth;
}

interface ActionPlan {
  id: string;
  title: string;
  description?: string;
  assignee?: string;
  dueDate?: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "todo" | "in-progress" | "completed" | "cancelled";
  projectId?: string;
  createdAt: string;
}

const actionPlans: ActionPlan[] = [
  {
    id: "1",
    title: "Follow up with Sarah Johnson",
    description: "Send proposal for web development project",
    assignee: "Josh",
    dueDate: "2025-01-20",
    priority: "high",
    status: "todo",
    projectId: "proj1",
    createdAt: "2025-01-15",
  },
  {
    id: "2",
    title: "Design mockups for TechCorp",
    description: "Create homepage and about page designs",
    assignee: "Sarah",
    dueDate: "2025-01-25",
    priority: "medium",
    status: "in-progress",
    projectId: "proj1",
    createdAt: "2025-01-10",
  },
  {
    id: "3",
    title: "Set up staging environment",
    description: "Configure hosting and deploy staging",
    assignee: "Mike",
    dueDate: "2025-01-18",
    priority: "urgent",
    status: "todo",
    projectId: "proj2",
    createdAt: "2025-01-12",
  },
  {
    id: "4",
    title: "Client review meeting",
    description: "Present designs to client and gather feedback",
    assignee: "Josh",
    dueDate: "2025-01-22",
    priority: "high",
    status: "completed",
    projectId: "proj1",
    createdAt: "2025-01-08",
  },
];

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const projectId = searchParams.get("projectId");

  let result = [...actionPlans];
  if (status) result = result.filter((p) => p.status === status);
  if (projectId) result = result.filter((p) => p.projectId === projectId);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const newPlan: ActionPlan = {
    id: String(Date.now()),
    title: body.title ?? "",
    description: body.description,
    assignee: body.assignee,
    dueDate: body.dueDate,
    priority: body.priority ?? "medium",
    status: "todo",
    projectId: body.projectId,
    createdAt: new Date().toISOString().split("T")[0],
  };
  actionPlans.push(newPlan);
  return NextResponse.json(newPlan, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const index = actionPlans.findIndex((p) => p.id === body.id);
  if (index === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  actionPlans[index] = { ...actionPlans[index], ...body };
  return NextResponse.json(actionPlans[index]);
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const index = actionPlans.findIndex((p) => p.id === id);
  if (index === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  actionPlans.splice(index, 1);
  return NextResponse.json({ message: "Deleted" });
}
