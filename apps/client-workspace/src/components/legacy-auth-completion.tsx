"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { confirmLegacySession, parseLegacyAuthFragment } from "@/lib/auth-flow";
import { createLegacyCompletionClient } from "@/lib/supabase/client";

export default function LegacyAuthCompletion({
  nextPath,
  hadAuthError,
}: {
  nextPath: string;
  hadAuthError: boolean;
}) {
  const [status, setStatus] = useState<"checking" | "error">("checking");
  const completionRef = useRef<Promise<boolean> | null>(null);

  useEffect(() => {
    if (!completionRef.current) {
      const fragment = parseLegacyAuthFragment(window.location.hash);
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);

      completionRef.current = (async () => {
        if (fragment.kind !== "session") return false;

        try {
          const supabase = createLegacyCompletionClient();
          return await confirmLegacySession(supabase.auth, fragment);
        } catch {
          return false;
        }
      })();
    }

    let active = true;
    void completionRef.current.then((completed) => {
      if (!active) return;
      if (completed) {
        window.location.replace(nextPath);
      } else {
        setStatus("error");
      }
    });

    return () => {
      active = false;
    };
  }, [nextPath]);

  const message = hadAuthError
    ? "This sign-in link could not be completed or has expired. Request a fresh one."
    : "This sign-in link is missing, invalid, or expired. Request a fresh one.";

  return (
    <div className="form-stack">
      <p className={`form-message${status === "error" ? " error" : ""}`} aria-live="polite" aria-atomic="true">
        {status === "checking" ? "Checking sign-in link…" : message}
      </p>
      {status === "error" ? <Link className="button button-primary" href="/login">Request a new sign-in link</Link> : null}
      <p className="micro-note">Only approved workspace accounts can open staff pages.</p>
    </div>
  );
}
