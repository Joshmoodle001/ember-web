"use client";
import { useEffect, useRef, useState } from "react";
import { parseLegacyAuthFragment, confirmLegacySession } from "@/lib/auth-flow";
import { createLegacyCompletionClient } from "@/lib/supabase/client";
export default function ClientConfirmation() {
  const operation = useRef<Promise<boolean> | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!operation.current) {
      const fragment = parseLegacyAuthFragment(window.location.hash);
      window.history.replaceState(null, "", window.location.pathname);
      operation.current = (async () => {
        try { return await confirmLegacySession(createLegacyCompletionClient().auth, fragment); }
        catch { return false; }
      })();
    }
    let active = true;
    void operation.current.then((ok) => { if (active) { if (ok) window.location.replace("/account"); else setFailed(true); } });
    return () => { active = false; };
  }, []);
  return <section className="account-card account-auth"><h1>{failed ? "Confirmation could not be completed" : "Confirming your account…"}</h1><p className="account-note">{failed ? "The link may have expired. If you already confirmed your email, sign in with your password." : "Please keep this page open."}</p><a href="/account/login">Return to client sign in</a></section>;
}
