import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { dashboardDestination } from "@/lib/login-destination";
import { getAdminEmails } from "@/lib/supabase/env";
import ClientDashboard from "@/components/client-dashboard";
export default async function AccountPage() {
  let email: string | undefined;
  let destination: "/admin" | "/account" | null = null;
  try { const supabase = await createClient(); const { data, error } = await supabase.auth.getUser(); if (!error && data.user?.email_confirmed_at) { email = data.user.email; destination = dashboardDestination(data.user, getAdminEmails()); } } catch { /* Show sign-in if authentication is unavailable. */ }
  if (!email) redirect("/login");
  if (destination === "/admin") redirect("/admin");
  return <main className="account-shell"><header className="account-top"><Link className="brand" href="/">EMBER<span>WEB</span></Link><nav aria-label="Client dashboard"><a href="/book">Book a meeting</a><form action="/api/account/logout" method="post"><button>Sign out</button></form></nav></header><section className="account-heading"><p className="eyebrow">YOUR PRIVATE DASHBOARD</p><h1>Everything you’re building, together.</h1><p className="account-note">Signed in as {email}. View the projects and resources shared with your business.</p></section><ClientDashboard /></main>;
}
