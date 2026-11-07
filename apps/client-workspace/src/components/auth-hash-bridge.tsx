"use client";

import { useEffect } from "react";
import { hasLegacyAuthFragment } from "@/lib/auth-flow";

let redirectingToLegacyCompletion = false;

export default function AuthHashBridge() {
  useEffect(() => {
    if (redirectingToLegacyCompletion) return;

    const currentUrl = new URL(window.location.href);
    if (currentUrl.pathname !== "/" && currentUrl.pathname !== "/login") return;
    if (!hasLegacyAuthFragment(currentUrl.hash)) return;

    redirectingToLegacyCompletion = true;
    window.location.replace(`/auth/legacy-completion${currentUrl.search}${currentUrl.hash}`);
  }, []);

  return null;
}
