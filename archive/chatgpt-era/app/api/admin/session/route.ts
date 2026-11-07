import { adminCookie, createSession, credentialsAreValid } from "../../../admin/owner";

export async function POST(request: Request) {
  const body = await request.json() as Record<string, unknown>; const username = typeof body.username === "string" ? body.username : ""; const password = typeof body.password === "string" ? body.password : "";
  if (!credentialsAreValid(username, password)) return Response.json({ error: "That username or password is not correct." }, { status: 401 });
  const response = Response.json({ ok: true }); response.headers.append("Set-Cookie", `${adminCookie.name}=${createSession()}; Path=/; Max-Age=${adminCookie.options.maxAge}; HttpOnly; SameSite=Lax${adminCookie.options.secure ? "; Secure" : ""}`); return response;
}
export async function DELETE() { const response = Response.json({ ok: true }); response.headers.append("Set-Cookie", `${adminCookie.name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`); return response; }
