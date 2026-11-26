/* Scope /account only. Never cache authenticated HTML, API responses, invoices or tokens. */
const CACHE="ember-client-shell-v2";
const SHELL=["/account/offline.html","/account/offline.css","/account/offline.js","/account/icon-192.png","/account/icon-512.png","/account/manifest.webmanifest"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));self.skipWaiting();});
self.addEventListener("activate", event => {
 const clearLegacyData = "indexedDB" in self ? new Promise(resolve => {
  const request = self.indexedDB.deleteDatabase("ember-workspace-v1");
  request.onsuccess = request.onerror = request.onblocked = resolve;
 }) : Promise.resolve();
 event.waitUntil(Promise.all([
  clearLegacyData,
  caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("ember-client-shell-") && key !== CACHE).map(key => caches.delete(key)))),
  self.clients.claim(),
 ]));
});
self.addEventListener("fetch",event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=="GET"||url.origin!==self.location.origin)return;
 if(SHELL.includes(url.pathname)){event.respondWith(caches.match(event.request).then(saved=>saved||fetch(event.request)));return;}
 if(event.request.mode==="navigate"&&(url.pathname==="/account"||url.pathname.startsWith("/account/"))){event.respondWith(fetch(event.request).catch(()=>caches.match("/account/offline.html")));}
});
