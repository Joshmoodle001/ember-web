import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "@/components/login-form";
import ClientAccountLogin from "@/components/client-account-login";
import { workspaceIdentity } from "@/lib/workspace-identity";
import { createClient } from "@/lib/supabase/server";
import "../account/account.css";

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ error?: string | string[]; method?: string | string[]; register?: string | string[] }>;
}) {
  const params = await searchParams;
  let destination: "/admin" | "/account" | null = null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user?.email_confirmed_at) {const identity=await workspaceIdentity(data.user.id);destination=identity?(identity.role==="client"?"/account":"/admin"):null;}
  } catch { /* Keep sign-in available while authentication is unavailable. */ }
  if (destination) redirect(destination);
  const emailRecovery = params.method === "email";
  const registrationEnabled = false;
  return (
    <main className="account-shell">
      <header className="account-top"><Link className="brand" href="/">EMBER<span>WEB</span></Link><Link href="/">Back to website</Link></header>
      <section className="account-card account-auth">
        <p className="eyebrow">CUSTOMER LOGIN</p>
        <h1>{emailRecovery ? "Recover your team access" : "One login. Your workspace."}</h1>
        <p className="account-note">{emailRecovery ? "An approved EmberWeb team account can request a one-time email link. Complete this recovery option on the portal domain in the same browser." : "Clients and the EmberWeb team sign in here. Your account automatically opens the dashboard you have permission to use."}</p>
        {emailRecovery ? <><LoginForm mode="email" /><p className="account-note"><Link href="/login">Back to Customer Login</Link></p></> : <>
          <ClientAccountLogin confirmationError={params.error === "link"} register={registrationEnabled && params.register === "1"} registrationEnabled={registrationEnabled} />
          <p className="account-note"><a href="https://portal.emberweb.co.za/password">Create or reset your password</a></p>
        </>}
      </section>
    </main>
  );
}
