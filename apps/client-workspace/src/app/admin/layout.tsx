import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminEmails } from "@/lib/supabase/env";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let userEmail: string | undefined;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userEmail = user?.email?.toLowerCase();
  } catch {
    redirect("/login");
  }
  if (!userEmail) redirect("/login");
  if (!getAdminEmails().includes(userEmail)) redirect("/login?error=access");

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <Link className="brand" href="/admin">EMBER<span>WORKSPACE</span></Link>
        <nav className="admin-nav" aria-label="Workspace">
          <Link href="/admin">Business overview</Link>
          <Link href="/admin/outreach">Outreach</Link>
          <Link href="/admin/meetings">Appointments</Link>
          <Link href="/admin/proposals">Proposals</Link>
          <Link href="/admin/finance">Finance</Link>
          <Link href="/admin/projects">Projects</Link>
          <Link href="/admin/requests">Requests</Link>
          <Link href="/admin/clients">Clients & access</Link>
          <Link href="/admin/notifications">Notifications</Link>
          <Link href="/admin/connections">Connections</Link>
        </nav>
        <div className="admin-user"><span>{userEmail}</span><form action="/auth/signout" method="post"><button type="submit">Sign out</button></form></div>
      </header>
      <main className="admin-main">{children}</main>
      <footer className="admin-footer">Private EmberWeb workspace · access is checked by Supabase Auth and database policies</footer>
    </div>
  );
}
