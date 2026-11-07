export type RequestStatus = "open" | "in_progress" | "waiting_on_client" | "resolved";
export type RequestClient = { id: string; full_name: string; company: string | null };
export type ClientRequest = {
  id: string; client_id: string; project_id: string | null; subject: string; description: string;
  status: RequestStatus; created_at: string; updated_at: string;
  message_count?: number;
  client: RequestClient; project: { id: string; title: string } | null;
  messages: { id: string; body: string; author_role: "client" | "staff"; created_at: string }[];
};
export const requestStatuses: { value: RequestStatus; label: string }[] = [
  { value: "open", label: "Open" }, { value: "in_progress", label: "In progress" },
  { value: "waiting_on_client", label: "Waiting on client" }, { value: "resolved", label: "Resolved" },
];
export function requestStatusLabel(status: RequestStatus) {
  return requestStatuses.find((item) => item.value === status)?.label ?? "Unknown status";
}
export function requestDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" }).format(date);
}
export default function RequestThread({ request }: { request: ClientRequest }) {
  return <article className="request-thread" aria-label={`Conversation: ${request.subject}`}>
    <header><span className="account-status">{requestStatusLabel(request.status)}</span><h3>{request.subject}</h3><p className="muted">{request.project?.title ?? "General account request"} · {requestDate(request.created_at)} SAST</p></header>
    <div className="request-message"><strong>Original request</strong><p>{request.description}</p></div>
    {typeof request.message_count === "number" && request.message_count > request.messages.length ? <p className="muted">Showing the latest {request.messages.length} of {request.message_count} replies.</p> : null}
    {request.messages.map((message) => <div className={`request-message request-message-${message.author_role}`} key={message.id}><strong>{message.author_role === "staff" ? "EmberWeb team" : "Client"}</strong><time dateTime={message.created_at}>{requestDate(message.created_at)} SAST</time><p>{message.body}</p></div>)}
  </article>;
}
