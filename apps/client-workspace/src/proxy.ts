import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // Public offline assets must work without an Auth refresh or a live connection.
  if (/^\/account\/(?:sw\.js|store\.js|offline\.(?:html|css|js)|manifest\.webmanifest|icon-(?:192|512)\.png)$/.test(request.nextUrl.pathname)) return NextResponse.next({ request });
  if (request.nextUrl.pathname.startsWith("/pay/")) {
    const response = NextResponse.next({ request });
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([header, value]) => response.headers.set(header, value));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  if (request.nextUrl.pathname.startsWith("/admin") && !data?.claims) {
    const loginUrl = new URL("/login", process.env.NODE_ENV === "production" ? "https://emberweb.co.za" : request.nextUrl.origin);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    const denied = NextResponse.redirect(loginUrl);
    denied.headers.set("Cache-Control", "private, no-store");
    return denied;
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/pay/:path*"],
};
