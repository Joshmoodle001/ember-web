import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { IDBFactory } from "fake-indexeddb";

const source = await readFile(new URL("../public/account/sw.js", import.meta.url), "utf8");
const origin = "https://portal.example.test";

test("upgrading drops legacy IndexedDB and shell caches without handling private API traffic", async () => {
  const events = new Map();
  const indexedDB = new IDBFactory();
  await new Promise((resolve, reject) => {
    const request = indexedDB.open("ember-workspace-v1");
    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
    request.onerror = reject;
  });
  const removed = [];
  const caches = {
    keys: async () => ["ember-client-shell-v1", "ember-client-shell-v2", "unrelated"],
    delete: async name => removed.push(name),
    match: async path => path,
  };
  const self = {
    indexedDB,
    location: { origin },
    clients: { claim: async () => {} },
    addEventListener: (name, handler) => events.set(name, handler),
  };
  vm.runInNewContext(source, { self, caches, URL, fetch: async () => { throw Error("offline"); } });
  await new Promise(resolve => events.get("activate")({ waitUntil: promise => promise.then(resolve) }));
  assert.deepEqual(removed, ["ember-client-shell-v1"]);
  assert.deepEqual(await indexedDB.databases(), []);
  assert.equal(events.has("sync"), false);

  const request = { method: "GET", mode: "navigate" };
  for (const path of ["/api/account", "/pay/sample", "/admin/projects"]) {
    events.get("fetch")({
      request: { ...request, url: origin + path },
      respondWith: () => assert.fail("Offline worker intercepted private traffic"),
    });
  }
  await new Promise(resolve => {
    events.get("fetch")({
      request: { ...request, url: origin + "/account" },
      respondWith: promise => promise.then(path => {
        assert.equal(path, "/account/offline.html");
        resolve();
      }),
    });
  });
});
