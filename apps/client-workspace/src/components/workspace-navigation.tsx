"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import type { WorkspaceRole } from "@/lib/workspace-model";
import { navigationSections, workspaceLocation } from "@/lib/workspace-navigation";

export function WorkspaceLocation() {
  const location = workspaceLocation(usePathname());
  return <div className="workspace-location"><span>{location.section}</span><span aria-hidden="true">/</span><strong>{location.label}</strong></div>;
}

function NavigationItems({ role, onNavigate }: { role: WorkspaceRole; onNavigate?: () => void }) {
  const path = usePathname();
  const [search, setSearch] = useState("");
  const sections = navigationSections(role, search);
  const location = workspaceLocation(path);
  return <>
    <label className="workspace-nav-search"><span className="sr-only">Find a workspace tool</span><input type="search" placeholder="Find a tool…" value={search} onChange={event => setSearch(event.target.value)} /></label>
    <nav aria-label="Staff workspace">
      {!search && <Link href="/admin" className="workspace-overview-link" aria-current={path === "/admin" ? "page" : undefined} onClick={onNavigate}><span aria-hidden="true">⌂</span> Overview</Link>}
      {sections.map(section => <details className="workspace-nav-group" key={`${section.id}:${location.section}:${!!search}`} open={!!search || section.label === location.section || (path === "/admin" && section.id === "work")}>
        <summary>{section.label}<span aria-hidden="true">⌄</span></summary>
        <div>{section.items.map(item => <Link key={item.href} href={item.href} aria-current={path === item.href || path.startsWith(`${item.href}/`) ? "page" : undefined} onClick={onNavigate}>{item.label}</Link>)}</div>
      </details>)}
      {!sections.length && <p className="workspace-nav-empty">No matching tools. Try “projects”, “password” or “invoices”.</p>}
    </nav>
  </>;
}

export default function WorkspaceNavigation({ role }: { role: WorkspaceRole }) {
  const menu = useRef<HTMLDialogElement>(null);
  const brand = <Link href="/admin" className="control-brand"><Image unoptimized src="/account/icon-192.png" alt="" width={35} height={35} />EMBERWEB<span>WORKSPACE</span></Link>;
  return <>
    <aside className="control-sidebar">{brand}<NavigationItems role={role} /><div className="workspace-sidebar-foot"><span>{role === "super_admin" ? "Super admin" : "Admin"}</span><small>Private team workspace</small></div></aside>
    <button className="workspace-menu-trigger" aria-label="Open workspace navigation" onClick={() => menu.current?.showModal()}><span aria-hidden="true">☰</span> Menu</button>
    <dialog ref={menu} className="workspace-menu-dialog" aria-labelledby="workspace-menu-title"><div className="workspace-menu-heading"><h2 id="workspace-menu-title">Workspace menu</h2><button onClick={() => menu.current?.close()} aria-label="Close workspace navigation">Close ×</button></div><NavigationItems role={role} onNavigate={() => menu.current?.close()} /></dialog>
  </>;
}
