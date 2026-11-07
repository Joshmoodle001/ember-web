import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAdminEmails } from "@/lib/supabase/env";
import { readLimitedText } from "@/lib/request-body";
import { checkRateLimits, getTrustedClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  const json = (body: unknown, status: number) => NextResponse.json(body, { status, headers });
  const origin = request.headers.get("origin");
  const origins = new Set(["https://emberweb.co.za", "https://www.emberweb.co.za", "https://portal.emberweb.co.za"]);
  if (process.env.NODE_ENV !== "production") origins.add(new URL(request.url).origin);
  if (!origin || !origins.has(origin)) return json({ error: "Origin not allowed." }, 403);
  let code: string, password: string;
  try {
    const body: unknown = JSON.parse(await readLimitedText(request, 2000));
    if (!body || typeof body !== "object" || Array.isArray(body) || !("code" in body) || !("password" in body) || typeof body.code !== "string" || typeof body.password !== "string") throw new Error("invalid");
    code = body.code.trim(); password = body.password;
  } catch { return json({ error: "Check the activation code and password." }, 400); }
  if (!/^[a-f0-9]{64}$/.test(code) || password.length < 12 || password.length > 128) return json({ error: "Use the owner activation code and a password of 12–128 characters." }, 400);
  try {
    const service = createServiceClient();
    const platformIp = request.headers.get("x-vercel-forwarded-for")?.trim();
    const ip = process.env.NODE_ENV === "production" ? process.env.VERCEL === "1" && platformIp && isIP(platformIp) ? platformIp : null : getTrustedClientIp(request.headers);
    if (process.env.NODE_ENV === "production" && !ip) return json({ error: "Activation protection is temporarily unavailable." }, 503);
    const codeHash = createHash("sha256").update(code).digest("hex");
    const allowed = await checkRateLimits(service, [{ scope: "owner-activation:code", identity: codeHash, limit: 5, windowSeconds: 3600 }, ...(ip ? [{ scope: "owner-activation:ip", identity: ip, limit: 10, windowSeconds: 3600 }] : [])]);
    if (!allowed) return json({ error: "Please wait before trying again." }, 429);
    const { data: userId, error } = await service.rpc("claim_owner_activation", { p_code_hash: codeHash });
    if (error) return json({ error: "Activation is temporarily unavailable." }, 503);
    if (typeof userId !== "string") return json({ error: "The activation code is invalid, expired or already used." }, 400);
    const user = await service.auth.admin.getUserById(userId);
    if (user.error || !user.data.user.email || !getAdminEmails().includes(user.data.user.email.toLowerCase())) return json({ error: "Activation could not be completed. Contact the workspace owner." }, 403);
    if (!user.data.user.email_confirmed_at) return json({ error: "The existing owner email must be confirmed before password activation. Complete its original invitation, then request a fresh activation code." }, 403);
    const update = await service.auth.admin.updateUserById(userId, { password });
    if (update.error) return json({ error: "Activation was consumed but the password could not be saved. Ask the owner to issue a fresh activation code." }, 503);
    return json({ success: true }, 200);
  } catch { return json({ error: "Activation is temporarily unavailable." }, 503); }
}
