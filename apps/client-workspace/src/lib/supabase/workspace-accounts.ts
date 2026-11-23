import "server-only";
import { isSharedWorkspace, workspaceBroker } from "./scope";
import { createServiceClient } from "./service";

type WorkspaceAccount = { id: string; email: string | null; authEmail: string; verified: boolean };

async function callBroker<T>(action: string, input: Record<string, unknown>): Promise<T> {
  const response = await workspaceBroker("account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...input }),
  });
  if (!response.ok) throw new Error("Workspace account operation failed.");
  return response.json() as Promise<T>;
}

export async function findWorkspaceAccount(email: string) {
  if (isSharedWorkspace()) return callBroker<WorkspaceAccount | null>("lookup", { email });
  const admin = createServiceClient().auth.admin;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const user = data.users.find((item) => item.email?.toLowerCase() === email);
    if (user?.email) return { id: user.id, email: user.email, authEmail: user.email, verified: Boolean(user.email_confirmed_at) };
    if (data.users.length < 100) break;
  }
  return null;
}

export async function getWorkspaceAccount(id: string) {
  if (isSharedWorkspace()) return callBroker<WorkspaceAccount | null>("get", { id });
  const { data, error } = await createServiceClient().auth.admin.getUserById(id);
  if (error || !data.user?.email) return null;
  return { id: data.user.id, email: data.user.email, authEmail: data.user.email, verified: Boolean(data.user.email_confirmed_at) };
}

export async function prepareWorkspaceLink(email: string, invite: boolean) {
  if (isSharedWorkspace()) {
    const result = await callBroker<{ id: string; token: string } | null>("prepare", { email, invite });
    return result && { ...result, type: "recovery" };
  }
  const type = invite ? "invite" : "recovery";
  const { data, error } = await createServiceClient().auth.admin.generateLink({ type, email });
  if (!invite && ["user_not_found", "email_not_found"].includes(error?.code ?? "")) return null;
  if (error || !data.user || !data.properties?.hashed_token) throw new Error("Password email could not be prepared.");
  return { id: data.user.id, token: data.properties.hashed_token, type };
}

export async function updateWorkspaceAccount(id: string, name: string, phone: string) {
  if (isSharedWorkspace()) {
    const result = await callBroker<{ success: boolean } | null>("details", { id, name, phone });
    if (!result?.success) throw new Error("Workspace account unavailable.");
    return;
  }
  const admin = createServiceClient().auth.admin;
  const { data, error } = await admin.getUserById(id);
  if (error || !data.user) throw new Error("Workspace account unavailable.");
  const changed = await admin.updateUserById(id, { user_metadata: { ...data.user.user_metadata, full_name: name, contact_phone: phone } });
  if (changed.error) throw changed.error;
}

export async function deleteWorkspaceAccount(id: string, confirmEmail: string) {
  if (isSharedWorkspace()) {
    const result = await callBroker<{ success: boolean } | null>("delete", { id, confirmEmail });
    if (!result?.success) throw new Error("Workspace account unavailable.");
    return;
  }
  const deleted = await createServiceClient().auth.admin.deleteUser(id, true);
  if (deleted.error) throw deleted.error;
}

export async function provisionWorkspaceUsername(provisionId: string, password: string): Promise<{ id: string; recovered?: boolean } | null> {
  if (isSharedWorkspace()) return callBroker<WorkspaceAccount | null>("create", { provisionId, password });
  const admin = createServiceClient().auth.admin;
  const email = `${provisionId}@login.emberweb.invalid`;
  const created = await admin.createUser({ email, password, email_confirm: true, app_metadata: { workspace_provisioning_id: provisionId } });
  if (created.data.user) return { id: created.data.user.id, recovered: false };
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const user = data.users.find((item) => item.email === email && item.app_metadata?.workspace_provisioning_id === provisionId);
    if (user) return { id: user.id, recovered: true };
    if (data.users.length < 100) break;
  }
  return null;
}
