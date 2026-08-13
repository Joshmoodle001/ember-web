import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const cookieName = "emberweb_admin";
const oneWeek = 60 * 60 * 24 * 7;
function username() { return process.env.ADMIN_USERNAME?.trim() || "josh"; }
function password() { return process.env.ADMIN_PASSWORD || "josh1234"; }
function secret() { return process.env.ADMIN_SESSION_SECRET || `emberweb:${username()}:${password()}:session`; }
function signature(payload: string) { return createHmac("sha256", secret()).update(payload).digest("base64url"); }

export function credentialsAreValid(candidateUsername: string, candidatePassword: string) { return candidateUsername === username() && candidatePassword === password(); }
export function createSession() { const payload = `${username()}.${Math.floor(Date.now() / 1000) + oneWeek}`; return `${Buffer.from(payload).toString("base64url")}.${signature(payload)}`; }
export async function isOwner() {
  const value = (await cookies()).get(cookieName)?.value;
  if (!value) return false;
  const [encoded, receivedSignature] = value.split(".");
  if (!encoded || !receivedSignature) return false;
  try { const payload = Buffer.from(encoded, "base64url").toString(); const expectedSignature = signature(payload); if (receivedSignature.length !== expectedSignature.length || !timingSafeEqual(Buffer.from(receivedSignature), Buffer.from(expectedSignature))) return false; const [sessionUser, expiresAt] = payload.split("."); return sessionUser === username() && Number(expiresAt) > Math.floor(Date.now() / 1000); } catch { return false; }
}
export const adminCookie = { name: cookieName, options: { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: oneWeek } };
