"use client";
import { createContext,useContext,useEffect,useRef,useState,useCallback,useSyncExternalStore,type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { WorkspaceIdentity } from "@/lib/workspace-model";
import { clearWorkspaceCookies } from "@/lib/browser-session";
const onlineSubscription=(callback:()=>void)=>{window.addEventListener("online",callback);window.addEventListener("offline",callback);return()=>{window.removeEventListener("online",callback);window.removeEventListener("offline",callback);};};
type Pending={id:string;ownerId:string;url:string;payload:Record<string,unknown>;state:string;error:string;createdAt:number};
type CacheRow<T>={value:T;savedAt:number};
type Store={identify:(identity:WorkspaceIdentity)=>Promise<void>;cache:(ownerId:string,key:string,value:unknown)=>Promise<void>;cached:<T>(ownerId:string,key:string)=>Promise<CacheRow<T>|undefined>;pending:(ownerId:string)=>Promise<Pending[]>;enqueue:(ownerId:string,url:string,payload:Record<string,unknown>)=>Promise<string>;flush:(ownerId:string)=>Promise<void>;discard:(ownerId:string,id:string)=>Promise<void>;clear:()=>Promise<void>;subscribe:(fn:()=>void)=>()=>void};
declare global{interface Window{EmberStore?:Store}}
let loadingStore:Promise<Store>|null=null;
export function loadWorkspaceStore():Promise<Store>{
 if(window.EmberStore)return Promise.resolve(window.EmberStore);
 if(!loadingStore)loadingStore=new Promise((resolve,reject)=>{const script=document.createElement("script");script.src="/account/store.js";script.onload=()=>window.EmberStore?resolve(window.EmberStore):reject(Error("Device storage unavailable."));script.onerror=()=>{loadingStore=null;reject(Error("Device storage could not load."));};document.head.append(script);});
 return loadingStore;
}
type Runtime={identity:WorkspaceIdentity;online:boolean;revision:number;read:<T>(url:string,cacheKey:string,offlineValue?:(data:T)=>unknown)=>Promise<T>;commit:(url:string,payload:Record<string,unknown>)=>Promise<{queued:boolean}>;setProject:(id:string|null)=>void};
const Context=createContext<Runtime|null>(null);
export function useWorkspace(){const value=useContext(Context);if(!value)throw Error("Workspace context is missing.");return value;}
type InstallPrompt=Event&{prompt:()=>Promise<void>};
export default function WorkspaceRuntime({identity,children}:{identity:WorkspaceIdentity;children:ReactNode}){
 const online=useSyncExternalStore(onlineSubscription,()=>navigator.onLine,()=>true);
 const [items,setItems]=useState<Pending[]>([]),[notice,setNotice]=useState(""),[revision,setRevision]=useState(0),[showSaved,setShowSaved]=useState(false),[activeProject,setProject]=useState<string|null>(null),[install,setInstall]=useState<InstallPrompt|null>(null);
 const path=usePathname(),storeRef=useRef<Store|null>(null);
 const refresh=useCallback(async()=>{if(storeRef.current){setItems(await storeRef.current.pending(identity.id));setRevision(x=>x+1);}},[identity.id]);
 useEffect(()=>{
  let active=true,unsubscribe:(()=>void)|undefined;
  const sync=()=>{if(navigator.onLine&&!document.hidden)void storeRef.current?.flush(identity.id).then(refresh);};
  const prompt=(event:Event)=>{event.preventDefault();setInstall(event as InstallPrompt);};
  window.addEventListener("online",sync);window.addEventListener("offline",sync);document.addEventListener("visibilitychange",sync);
  if(identity.role==="client")window.addEventListener("beforeinstallprompt",prompt);
  void loadWorkspaceStore().then(async store=>{await store.identify(identity);if(!active)return;storeRef.current=store;unsubscribe=store.subscribe(()=>void refresh());await refresh();await store.flush(identity.id);await refresh();if(identity.role==="client"&&"serviceWorker" in navigator)await navigator.serviceWorker.register("/account/sw.js",{scope:"/account"});}).catch(()=>{if(active)setNotice("Device storage is unavailable. Keep this page open and connect before saving edits.");});
  return()=>{active=false;unsubscribe?.();window.removeEventListener("online",sync);window.removeEventListener("offline",sync);document.removeEventListener("visibilitychange",sync);window.removeEventListener("beforeinstallprompt",prompt);};
 },[identity,refresh]);
 useEffect(()=>{
  async function beat(){if(document.hidden||!navigator.onLine)return;await fetch("/api/workspace/presence",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path,projectId:activeProject})}).catch(()=>{});}
  void beat();const timer=setInterval(()=>void beat(),60000);document.addEventListener("visibilitychange",beat);return()=>{clearInterval(timer);document.removeEventListener("visibilitychange",beat);};
 },[path,activeProject]);
 const read=useCallback(async<T,>(url:string,key:string,offlineValue?:(data:T)=>unknown):Promise<T>=>{
  const store=await loadWorkspaceStore().catch(()=>null);
  try{
   if(!navigator.onLine)throw Error("Offline");
   const response=await fetch(url,{cache:"no-store"});
   if([401,403].includes(response.status)){await store?.clear().catch(()=>{});window.location.replace("/login");throw Error("Your access has changed. Sign in again.");}
   if(!response.ok)throw Error("This workspace view could not be loaded.");
   const data=await response.json() as T;await store?.cache(identity.id,key,offlineValue?offlineValue(data):data).catch(()=>setNotice("Device storage is unavailable. Online work remains available; offline copies cannot be saved."));return data;
  }catch(error){
   if(navigator.onLine)throw error;
   const saved=await store?.cached<T>(identity.id,key).catch(()=>undefined);
   if(saved){setNotice(`Offline copy saved ${new Date(saved.savedAt).toLocaleString()}.`);return saved.value;}
   throw Error("Connect once to load this view on this device.");
  }
 },[identity.id]);
 const commit=useCallback(async(url:string,payload:Record<string,unknown>)=>{
  const store=await loadWorkspaceStore();
  let id:string;
  try { id=await store.enqueue(identity.id,url,payload); }
  catch(error) {
   if(!navigator.onLine)throw error;
   const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
   const result=await response.json();if(!response.ok)throw Error(result.error||"This change could not be saved.");
   setNotice("Saved online. Device storage is unavailable, so offline edits cannot be kept.");setRevision(x=>x+1);return {queued:false};
  }
  if(navigator.onLine)await store.flush(identity.id);
  const pending=await store.pending(identity.id);setItems(pending);setRevision(x=>x+1);
  if(identity.role==="client"&&"serviceWorker" in navigator)void navigator.serviceWorker.getRegistration("/account").then(registration=>{const sync=(registration as (ServiceWorkerRegistration&{sync?:{register:(tag:string)=>Promise<void>}})|undefined)?.sync;return sync?.register("ember-client-outbox");}).catch(()=>{});
  return {queued:pending.some(item=>item.id===id)};
 },[identity.id,identity.role]);
 return <Context.Provider value={{identity,online,revision,read,commit,setProject}}><div className="workspace-sync" role="status"><span className={`connection-dot ${online?"is-online":""}`} />{online?"Online":"Offline"}<span>{items.length?`${items.length} saved change${items.length===1?"":"s"} awaiting sync`:"Changes up to date"}</span>{items.length>0&&<button onClick={()=>setShowSaved(!showSaved)}>Review saved changes</button>}{identity.role==="client"&&install&&<button onClick={()=>void install.prompt().then(()=>setInstall(null))}>Install client app</button>}</div>{notice&&<p className="workspace-storage-note">{notice}</p>}{showSaved&&<section className="saved-changes"><h2>Saved on this device</h2><p>Conflicting changes stay here for review. Open the latest card before reapplying an edit.</p>{items.map(item=><article key={item.id}><strong>{String(item.payload.action)} · {item.state.replaceAll("_"," ")}</strong><p>{item.error||"Waiting for a connection and a verified sign-in."}</p><details><summary>Read your saved change</summary><p className="saved-change-copy">{String(item.payload.body??item.payload.description??item.payload.brief??item.payload.title??item.payload.stage??"Project update")}</p></details><button onClick={()=>{if(confirm("Discard this saved change from this device?"))void storeRef.current?.discard(identity.id,item.id).then(refresh);}}>Discard saved change</button></article>)}<button onClick={()=>void storeRef.current?.flush(identity.id).then(refresh)}>Try syncing</button></section>}{children}</Context.Provider>;
}

export function WorkspaceLogout(){
 const [busy,setBusy]=useState(false);
 async function logout(){
  const store=await loadWorkspaceStore().catch(()=>null);
  const pending=await store?.pending(identity.id).catch(()=>[]);if(pending?.length&&!confirm("You have unsynced changes. Signing out removes saved work from this device. Continue?"))return;
  setBusy(true);if(navigator.onLine)await fetch("/auth/signout",{method:"POST",credentials:"same-origin",signal:AbortSignal.timeout(8000)}).catch(()=>{});await store?.clear().catch(()=>{});
  clearWorkspaceCookies();
  window.location.replace("/login");
 }
 const {identity}=useWorkspace();
 return <button onClick={()=>void logout()} disabled={busy}>{busy?"Signing out…":"Sign out"}</button>;
}
