import { aliasFor, brokerFunction, dataSchema, isWorkspaceUser, projectOrigin } from "../../../supabase/functions/_shared/emberweb-scope.mjs";
import type { User } from "@supabase/supabase-js";

export function isSharedWorkspace(url = process.env.NEXT_PUBLIC_SUPABASE_URL) {
  return url === projectOrigin;
}

export function workspaceSchema(url: string) {
  return isSharedWorkspace(url) ? dataSchema : "public";
}

export function workspaceCookieOptions(url: string) {
  return isSharedWorkspace(url) ? { name: "emberweb-portal-auth" } : undefined;
}

export function ownsWorkspaceAccount(user: User) {
  return !isSharedWorkspace() || isWorkspaceUser(user);
}

export function workspaceEmail(user: User) {
  const email = isSharedWorkspace() ? user.app_metadata?.emberweb_email : user.email;
  return typeof email === "string" ? email : undefined;
}

export async function workspaceLoginEmail(email: string) {
  return isSharedWorkspace() ? aliasFor(email) : email;
}

export function workspaceBroker(path: string, init?: RequestInit) {
  const token = process.env.EMBERWEB_PORTAL_TOKEN;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new Error("EmberWeb provider is not configured.");
  const headers = new Headers(init?.headers);
  headers.delete("authorization");
  headers.delete("apikey");
  headers.set("x-emberweb-token", token);
  return fetch(`${projectOrigin}/functions/v1/${brokerFunction}/${path}`, { ...init, headers, cache: "no-store", redirect: "error" });
}
