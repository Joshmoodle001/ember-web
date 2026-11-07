"use client";

import { useEffect, useState } from "react";

type NotificationStatus = "pending" | "sending" | "sent" | "failed";
type StaffNotification = {
  outbox_id: string;
  inquiry_id: string;
  inquiry_name: string;
  inquiry_email: string;
  status: NotificationStatus;
  attempts: number;
  next_attempt_at: string;
  lease_expires_at: string | null;
  last_error_code: string | null;
  created_at: string;
  sent_at: string | null;
};
type NotificationList = { notifications: StaffNotification[]; emailConfigured: boolean };
type NotificationResponse = { success?: boolean; status?: NotificationStatus; message?: string; error?: string };

const statuses = new Set<NotificationStatus>(["pending", "sending", "sent", "failed"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const errorLabels: Record<string, string> = {
  configuration_missing: "Resend is not configured",
  provider_rate_limited: "Resend is rate limiting email",
  provider_unavailable: "Resend is temporarily unavailable",
  provider_rejected: "Resend rejected the message",
  provider_timeout: "The send request timed out",
  provider_network_error: "The send request could not reach Resend",
  provider_invalid_response: "Resend returned an unexpected response",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStaffNotification(value: unknown): value is StaffNotification {
  return isRecord(value)
    && typeof value.outbox_id === "string"
    && uuidPattern.test(value.outbox_id)
    && typeof value.inquiry_id === "string"
    && uuidPattern.test(value.inquiry_id)
    && typeof value.inquiry_name === "string"
    && typeof value.inquiry_email === "string"
    && typeof value.status === "string"
    && statuses.has(value.status as NotificationStatus)
    && typeof value.attempts === "number"
    && Number.isInteger(value.attempts)
    && typeof value.next_attempt_at === "string"
    && (value.lease_expires_at === null || typeof value.lease_expires_at === "string")
    && (value.last_error_code === null || typeof value.last_error_code === "string")
    && typeof value.created_at === "string"
    && (value.sent_at === null || typeof value.sent_at === "string");
}

function isNotificationList(value: unknown): value is NotificationList {
  return isRecord(value)
    && Array.isArray(value.notifications)
    && value.notifications.every(isStaffNotification)
    && typeof value.emailConfigured === "boolean";
}

async function loadNotifications(signal?: AbortSignal): Promise<NotificationList> {
  const response = await fetch("/api/admin/notifications", { cache: "no-store", signal });
  const result: unknown = await response.json();
  if (!response.ok) {
    const message = isRecord(result) && typeof result.error === "string" ? result.error : "Notification status could not be loaded.";
    throw new Error(message);
  }
  if (!isNotificationList(result)) throw new Error("Notification status could not be loaded.");
  return result;
}

export default function StaffNotifications() {
  const [data, setData] = useState<NotificationList | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const result = await loadNotifications(controller.signal);
        if (!controller.signal.aborted) setData(result);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(true);
          setMessage(loadError instanceof Error ? loadError.message : "Notification status could not be loaded.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  async function retry(outboxId: string) {
    setWorkingId(outboxId);
    setMessage("");
    setError(false);
    try {
      const response = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outbox_id: outboxId }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const errorMessage = isRecord(result) && typeof result.error === "string" ? result.error : "Notification retry failed.";
        throw new Error(errorMessage);
      }
      const responseData = isRecord(result) ? result as NotificationResponse : {};
      setMessage(responseData.message || "Notification retry completed.");
      setData(await loadNotifications());
    } catch (retryError) {
      setError(true);
      setMessage(retryError instanceof Error ? retryError.message : "Notification retry failed.");
    } finally {
      setWorkingId(null);
    }
  }

  const notifications = data?.notifications ?? [];
  return (
    <div className="workspace-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">OPERATIONS</p>
          <h1>Staff notifications</h1>
          <p className="muted">Review delivery status for project briefs and retry staff alerts when needed.</p>
        </div>
      </div>
      {!data?.emailConfigured && (
        <p className="status-pill status-pending" role="status">
          Resend is not configured. New briefs are still saved and staff alerts stay pending until a key is added.
        </p>
      )}
      {message && <p className={error ? "inline-message error" : "inline-message"} aria-live="polite">{message}</p>}
      <section className="panel data-panel">
        <div className="section-heading">
          <div><p className="eyebrow">OUTBOX</p><h2>Recent project brief alerts</h2></div>
          <span className="muted">{notifications.length} shown</span>
        </div>
        {loading ? <p className="empty-state">Loading notification status…</p> : notifications.length === 0 ? (
          <div className="empty-state"><strong>No staff notification jobs yet.</strong><p>New project briefs will appear here after they are saved.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Inquiry</th><th>Status</th><th>Attempts</th><th>Created</th><th>Action</th></tr></thead>
              <tbody>
                {notifications.map((notification) => (
                  <tr key={notification.outbox_id}>
                    <td><strong>{notification.inquiry_name}</strong><small>{notification.inquiry_email}</small></td>
                    <td>
                      <span className={"status-pill " + (notification.status === "sent" ? "status-ready" : "status-pending")}>
                        {notification.status}
                      </span>
                      {notification.last_error_code && <small>{errorLabels[notification.last_error_code] || "Delivery needs attention"}</small>}
                    </td>
                    <td>{notification.attempts}</td>
                    <td>{new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(notification.created_at))}</td>
                    <td>
                      {notification.status === "sent"
                        ? <span className="stage-note">Delivered</span>
                        : <button className="small-button" type="button" disabled={workingId !== null || !data?.emailConfigured} onClick={() => void retry(notification.outbox_id)}>
                            {workingId === notification.outbox_id ? "Retrying…" : "Retry"}
                          </button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
