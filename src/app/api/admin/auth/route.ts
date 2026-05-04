import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { email: rawEmail, password: rawPassword } = await request.json();

    const emailLower = (rawEmail || "").trim().toLowerCase();
    const passwordTrim = (rawPassword || "").trim();

    const validEmail = "joshmoodley01@gmail.com";
    const validPassword = "1234";

    if (emailLower !== validEmail || passwordTrim !== validPassword) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const cookieStore = await cookies();
    cookieStore.set("admin_session", "admin-logged-in", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json({ success: true, user: { email: emailLower } });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_session");
  cookieStore.delete("admin_refresh");
  return NextResponse.json({ success: true });
}