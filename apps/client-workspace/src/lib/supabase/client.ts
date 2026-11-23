"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "./env";
import { workspaceCookieOptions } from "./scope";

export function createClient() {
  const { url, key } = getSupabasePublicConfig();
  return createBrowserClient(url, key, { cookieOptions: workspaceCookieOptions(url) });
}

export function createLegacyCompletionClient() {
  const { url, key } = getSupabasePublicConfig();
  return createBrowserClient(url, key, { auth: { detectSessionInUrl: false }, cookieOptions: workspaceCookieOptions(url) });
}
