import Link from "next/link";
import LegacyAuthCompletion from "@/components/legacy-auth-completion";
import { getSafeNextPath } from "@/lib/auth-flow";

export default async function LegacyCompletionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[]; next?: string | string[] }>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : null;

  return (
    <main className="shell narrow-shell">
      <header className="topbar">
        <Link className="brand" href="/">EMBER<span>WEB</span></Link>
        <span className="topbar-label">SECURE SIGN-IN</span>
      </header>
      <section className="panel auth-panel">
        <p className="eyebrow">STAFF ACCESS</p>
        <h1>Completing sign-in</h1>
        <p className="muted">We’re checking your sign-in link and saving your secure workspace session.</p>
        <LegacyAuthCompletion nextPath={getSafeNextPath(next)} hadAuthError={params.error === "link"} />
      </section>
    </main>
  );
}
