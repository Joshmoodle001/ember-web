export const projectRef = "szucqxbkhjotszfaekex";
export const workspaceId = "c5a1014d-1a15-4f29-acac-c7221799bdd3";
export const dataSchema = "emberweb";
export const memberRole = "emberweb_member";
export const aliasDomain = "@login.emberweb.invalid";
export const brokerFunction = "emberweb-portal";
export const projectOrigin = `https://${projectRef}.supabase.co`;

export async function aliasFor(email) {
  const data = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${workspaceId}:${email.toLowerCase().trim()}`)));
  return "email-" + Array.from(data, (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 48) + aliasDomain;
}

export function isWorkspaceUser(user) {
  return user?.role === memberRole && user?.email?.endsWith(aliasDomain)
    && user?.app_metadata?.emberweb_workspace_id === workspaceId;
}
