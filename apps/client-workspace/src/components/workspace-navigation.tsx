"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import type { WorkspaceRole } from "@/lib/workspace-model";
const links=[["/admin","Seed pipeline"],["/admin/projects","Project delivery"],["/admin/requests","Support requests"],["/admin/business","Business overview"],["/admin/finance","Finance"],["/admin/meetings","Appointments"],["/admin/proposals","Proposals"],["/admin/outreach","Outreach"],["/admin/notifications","Notifications"],["/admin/connections","Connections"]];
export default function WorkspaceNavigation({role}:{role:WorkspaceRole}){
 const path=usePathname(),mobile=useRef<HTMLDetailsElement>(null);
 const entries=role==="super_admin"?[...links,["/admin/leads","Lead research"],["/admin/clients","Clients & sites"],["/admin/accounts","Accounts & roles"],["/admin/activity","Analytics & audit"]]:links;
 const nav=<nav aria-label="Staff workspace">{entries.map(([href,label])=><Link key={href} href={href} aria-current={path===href?"page":undefined} onClick={()=>{if(mobile.current)mobile.current.open=false;}}>{label}<span aria-hidden="true">↗</span></Link>)}</nav>;
 return <><aside className="control-sidebar"><Link href="/admin" className="control-brand"><Image unoptimized src="/account/icon-192.png" alt="" width={35} height={35}/>EMBERWEB<span>WORKSPACE</span></Link><p className="control-role">{role==="super_admin"?"Super admin":"Admin"}</p>{nav}<small>Project and page activity is recorded in the workspace audit.</small></aside><details ref={mobile} className="control-mobile-menu"><summary>Workspace menu <span aria-hidden="true">☰</span></summary>{nav}</details></>;
}
