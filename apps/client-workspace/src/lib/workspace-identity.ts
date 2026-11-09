import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { WorkspaceIdentity } from "@/lib/workspace-model";
export async function workspaceIdentity(userId: string): Promise<WorkspaceIdentity | null> {
  const { data, error } = await createServiceClient().rpc("workspace_identity", { p_actor_id: userId });
  if (error) throw new Error("Account access could not be verified.");
  return data && ["super_admin","admin","client"].includes(data.role) ? data as WorkspaceIdentity : null;
}
export async function logAccountEvent(actorId: string, action: string, entityId?: string) {
  const { error } = await createServiceClient().rpc("workspace_log_event", { p_actor_id: actorId, p_action: action, p_entity_id: entityId ?? null });
  if(error) throw new Error("Account activity could not be recorded.");
}
