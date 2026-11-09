/* Shared by the browser workspace and the client-only service worker. No tokens or passwords. */
(function (scope) {
  "use strict";
  const databaseName = "ember-workspace-v1";
  let opening, syncing;
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("ember-workspace-data") : null;
  function changed() { channel?.postMessage("changed"); if (scope.dispatchEvent) scope.dispatchEvent(new Event("ember:storage")); }
  function db() {
    if (!opening) opening = new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => { request.result.createObjectStore("state", { keyPath: "key" }); request.result.createObjectStore("outbox", { keyPath: "id" }); };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => { opening = null; reject(new Error("Device storage is unavailable. Connect before saving changes.")); };
    });
    return opening;
  }
  async function operation(table, mode, command) {
    const database = await db();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(table, mode), request = command(transaction.objectStore(table));
      let result; request.onsuccess = () => { result = request.result; };
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(new Error("Device storage could not save this change."));
      transaction.onabort = () => reject(new Error("Device storage could not save this change."));
    });
  }
  const get = key => operation("state", "readonly", store => store.get(key));
  const put = value => operation("state", "readwrite", store => store.put(value));
  const all = () => operation("outbox", "readonly", store => store.getAll());
  const pending = async ownerId => (await all()).filter(item => item.ownerId === ownerId).sort((a,b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  async function identify(identity) {
    const current = await get("identity");
    if(current?.value?.id && current.value.id !== identity.id) await clear();
    await put({ key: "identity", value: identity });
  }
  const cache = async (ownerId, key, value) => { await put({ key: `${ownerId}:${key}`, ownerId, value, savedAt: Date.now() }); };
  const cached = async (ownerId, key) => await get(`${ownerId}:${key}`);
  function allowed(url, payload) {
    return url === "/api/account/requests" && ["create","reply"].includes(payload.action)
      || url === "/api/admin/pipeline" && ["create","stage","edit","comment"].includes(payload.action);
  }
  async function enqueue(ownerId, url, payload) {
    if (!allowed(url,payload) || !/^[0-9a-f-]{36}$/i.test(payload.submissionId || "")) throw new Error("This action requires an online connection.");
    if (JSON.stringify(payload).length > 20000) throw new Error("This change is too large to save on the device.");
    const items = await pending(ownerId);
    if (items.length >= 250) throw new Error("Sync or review your saved changes before adding more.");
    const id = `${ownerId}:${payload.submissionId}`;
    const existing = items.find(item => item.id === id);
    if(existing) {
      if(JSON.stringify(existing.payload)!==JSON.stringify(payload)) throw new Error("A saved submission cannot be reused for different content.");
      return id;
    }
    await operation("outbox","readwrite",store=>store.add({id,ownerId,url,payload,createdAt:Date.now(),state:"pending",error:""}));
    changed();
    return id;
  }
  async function drain(ownerId) {
    if(scope.navigator?.onLine === false) return;
    let identity;
    try {
      const response = await fetch("/api/workspace/identity",{cache:"no-store",credentials:"same-origin"});
      if(!response.ok) return;
      identity = (await response.json()).identity;
      if(identity?.id !== ownerId) return;
    } catch { return; }
    const blockedSeeds = new Set();
    for (const item of await pending(ownerId)) {
      if(item.state !== "pending") { if(item.payload.seedId) blockedSeeds.add(item.payload.seedId); continue; }
      if(blockedSeeds.has(item.payload.seedId)) continue;
      if(item.url.startsWith("/api/admin/") && !["admin","super_admin"].includes(identity.role)) return;
      let response;
      try { response = await fetch(item.url,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(item.payload)}); }
      catch { break; }
      if(response.ok) {
        await operation("outbox","readwrite",store=>store.delete(item.id));
        await put({key:`${ownerId}:lastSync`,value:Date.now()});
        changed();
      } else {
        if([401,429,500,502,503,504].includes(response.status)) break;
        const result = await response.json().catch(()=>({}));
        item.state=response.status===409?"conflict":"needs_review";
        item.error=typeof result.error==="string"?result.error:"This saved change needs review.";
        await operation("outbox","readwrite",store=>store.put(item));
        if(item.payload.seedId) blockedSeeds.add(item.payload.seedId);
        changed();
      }
    }
  }
  async function flush(ownerId) {
    if(syncing) return syncing;
    syncing = (async()=> {
      if(scope.navigator?.locks) return scope.navigator.locks.request("ember-workspace-sync",()=>drain(ownerId));
      return drain(ownerId); // Server submission IDs make concurrent retries idempotent.
    })();
    try { await syncing; } finally { syncing = null; }
  }
  async function discard(ownerId,id) {
    const item=(await pending(ownerId)).find(row=>row.id===id);
    if(item) await operation("outbox","readwrite",store=>store.delete(id));
    changed();
  }
  async function clear() {
    const database = await db();
    await new Promise((resolve,reject)=>{const tx=database.transaction(["state","outbox"],"readwrite");tx.objectStore("state").clear();tx.objectStore("outbox").clear();tx.oncomplete=resolve;tx.onerror=reject;});
    changed();
  }
  function subscribe(callback) {
    scope.addEventListener?.("ember:storage",callback); channel?.addEventListener("message",callback);
    return ()=>{scope.removeEventListener?.("ember:storage",callback);channel?.removeEventListener("message",callback);};
  }
  scope.EmberStore={identify,get,cache,cached,pending,enqueue,flush,discard,clear,subscribe};
})(globalThis);
