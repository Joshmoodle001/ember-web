export const clientRequestStatuses = ["open", "in_progress", "waiting_on_client", "resolved"] as const;
export type ClientRequestStatus = typeof clientRequestStatuses[number];
type CreateRequest = { action: "create"; clientId: string; projectId: string | null; subject: string; description: string; submissionId: string };
type ReplyRequest = { action: "reply"; requestId: string; body: string; submissionId: string };
type StatusRequest = { action: "status"; requestId: string; status: ClientRequestStatus };
export type RequestMutation = CreateRequest | ReplyRequest | StatusRequest;
const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const text = (value: unknown, max: number): string | null => typeof value === "string" && value.trim().length >= 2 && value.trim().length <= max && !value.includes("\0") ? value.trim() : null;
export function parseRequestMutation(value: unknown, staff: boolean, method: string): RequestMutation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const action = method === "PATCH" ? "status" : staff ? "reply" : body.action;
  const allowed = action === "create" ? ["action", "clientId", "projectId", "subject", "description", "submissionId"] : action === "reply" ? ["action", "requestId", "body", "submissionId"] : ["requestId", "status"];
  if (Object.keys(body).some((key) => !allowed.includes(key))) return null;
  if (action === "create" && !staff && method === "POST") {
    const subject = text(body.subject, 180), description = text(body.description, 4000);
    if (!uuid(body.clientId) || !uuid(body.submissionId) || (body.projectId != null && !uuid(body.projectId)) || !subject || !description) return null;
    return { action, clientId: body.clientId, projectId: body.projectId as string | null ?? null, subject, description, submissionId: body.submissionId };
  }
  if (action === "reply" && method === "POST") {
    const reply = text(body.body, 4000);
    if ((body.action !== undefined && body.action !== "reply") || !uuid(body.requestId) || !uuid(body.submissionId) || !reply) return null;
    return { action, requestId: body.requestId, body: reply, submissionId: body.submissionId };
  }
  if (action === "status" && staff && method === "PATCH" && uuid(body.requestId) && clientRequestStatuses.includes(body.status as ClientRequestStatus)) return { action, requestId: body.requestId, status: body.status as ClientRequestStatus };
  return null;
}

export type RequestWriteDependencies = {
  staff: boolean;
  actorId: string;
  allowedOrigin: (request: Request) => boolean;
  readBody: (request: Request, limit: number) => Promise<string>;
  rateLimit: () => Promise<boolean>;
  mutate: (actorId: string, staff: boolean, action: string, payload: RequestMutation) => Promise<{ data: string | null; error: { code?: string } | null }>;
};
export async function handleRequestWrite(request: Request, dependencies: RequestWriteDependencies) {
  if (!dependencies.allowedOrigin(request)) return { status: 403, body: { error: "This request could not be completed." } };
  let mutation: RequestMutation | null;
  try { mutation = parseRequestMutation(JSON.parse(await dependencies.readBody(request, 20_000)), dependencies.staff, request.method); }
  catch { return { status: 400, body: { error: "Check your request details and try again." } }; }
  if (!mutation) return { status: 400, body: { error: "Check your request details and try again." } };
  try {
    if (!await dependencies.rateLimit()) return { status: 429, body: { error: "Please wait a minute before submitting another update." } };
    const result = await dependencies.mutate(dependencies.actorId, dependencies.staff, mutation.action, mutation);
    if (result.error) {
      const code = result.error.code;
      if (code === "42501") return { status: 404, body: { error: "This request or project is unavailable for your account." } };
      if (code === "22023" || code === "22P02" || code === "23514") return { status: 400, body: { error: "Check your request details. A previous submission reference cannot be reused for changed content." } };
      return { status: 503, body: { error: "Requests are temporarily unavailable. Your update has not been confirmed; retry with the same submission." } };
    }
    if (!result.data) return { status: 503, body: { error: "Your update could not be confirmed. Please retry." } };
    return { status: 200, body: { requestId: result.data, notification: "dashboard_only" } };
  } catch { return { status: 503, body: { error: "Requests are temporarily unavailable. Please retry." } }; }
}
