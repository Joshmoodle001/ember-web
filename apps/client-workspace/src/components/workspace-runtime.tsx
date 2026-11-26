"use client";

import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { WorkspaceIdentity } from "@/lib/workspace-model";

const legacyDatabase = "ember-workspace-v1";
const sessionChannel = "ember-workspace-session";

function clearLegacyStorage() {
  if ("indexedDB" in window) indexedDB.deleteDatabase(legacyDatabase);
}

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

type Runtime = {
  identity: WorkspaceIdentity;
  online: boolean;
  revision: number;
  read: <T>(url: string) => Promise<T>;
  commit: (url: string, payload: Record<string, unknown>) => Promise<void>;
  setProject: (id: string | null) => void;
};
const Context = createContext<Runtime | null>(null);

export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw Error("Workspace context is missing.");
  return value;
}

type InstallPrompt = Event & { prompt: () => Promise<void> };

export default function WorkspaceRuntime({ identity, children }: { identity: WorkspaceIdentity; children: ReactNode }) {
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const [revision, setRevision] = useState(0);
  const [activeProject, setProject] = useState<string | null>(null);
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const path = usePathname();
  const accountId = identity.id;
  const isClient = identity.role === "client";

  useEffect(() => {
    clearLegacyStorage();
    const sessions = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(sessionChannel);
    const prompt = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallPrompt);
    };
    const checkSession = async () => {
      if (!navigator.onLine || document.hidden) return;
      const response = await fetch("/api/workspace/identity", { cache: "no-store" }).catch(() => null);
      if (!response) return;
      if (response.status === 401 || response.status === 403) window.location.replace("/login");
      if (response.ok && (await response.json().catch(() => null))?.identity?.id !== accountId) location.reload();
    };
    const restore = (event: PageTransitionEvent) => { if (event.persisted) location.reload(); };
    if (sessions) sessions.onmessage = () => location.replace("/login");
    window.addEventListener("pageshow", restore);
    window.addEventListener("online", checkSession);
    document.addEventListener("visibilitychange", checkSession);
    if (isClient) {
      window.addEventListener("beforeinstallprompt", prompt);
      if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/account/sw.js", { scope: "/account" }).catch(() => {});
    }
    return () => {
      sessions?.close();
      window.removeEventListener("pageshow", restore);
      window.removeEventListener("online", checkSession);
      document.removeEventListener("visibilitychange", checkSession);
      window.removeEventListener("beforeinstallprompt", prompt);
    };
  }, [accountId, isClient]);

  useEffect(() => {
    async function beat() {
      if (document.hidden || !navigator.onLine) return;
      await fetch("/api/workspace/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path, projectId: activeProject }) }).catch(() => {});
    }
    void beat();
    const timer = setInterval(() => void beat(), 60000);
    document.addEventListener("visibilitychange", beat);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", beat); };
  }, [path, activeProject]);

  const read = useCallback(async <T,>(url: string): Promise<T> => {
    if (!navigator.onLine) throw Error("Reconnect to load this workspace view.");
    const response = await fetch(url, { cache: "no-store" });
    if (response.status === 401) window.location.replace("/login");
    if (!response.ok) throw Error("This workspace view could not be loaded.");
    return response.json();
  }, []);

  const commit = useCallback(async (url: string, payload: Record<string, unknown>) => {
    if (!navigator.onLine) throw Error("Reconnect to save this change.");
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (response.status === 401) window.location.replace("/login");
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw Error(result.error || "This change could not be saved.");
    }
    setRevision(value => value + 1);
  }, []);

  return <Context.Provider value={{ identity, online, revision, read, commit, setProject }}>
    <div className="workspace-sync" role="status"><span className={`connection-dot ${online ? "is-online" : ""}`} />
      {online ? "Online" : "Offline. Reconnect to load or save work."}
      {isClient && install && <button onClick={() => void install.prompt().then(() => setInstall(null))}>Install client app</button>}
    </div>
    {children}
  </Context.Provider>;
}

export function WorkspaceLogout() {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function logout() {
    setBusy(true);
    const response = await fetch("/auth/signout", { method: "POST", redirect: "manual", signal: AbortSignal.timeout(8000) }).catch(() => null);
    if (!response?.ok && response?.type !== "opaqueredirect") {
      setNotice("Reconnect to sign out securely.");
      setBusy(false);
      return;
    }
    clearLegacyStorage();
    if (typeof BroadcastChannel !== "undefined") {
      const sessions = new BroadcastChannel(sessionChannel);
      sessions.postMessage("signed-out");
      sessions.close();
    }
    window.location.replace("/login");
  }
  return <><button onClick={() => void logout()} disabled={busy}>{busy ? "Signing out…" : "Sign out"}</button>{notice && <span role="status">{notice}</span>}</>;
}
