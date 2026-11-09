import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { IDBFactory } from "fake-indexeddb";
const source=await readFile(new URL("../public/account/store.js",import.meta.url),"utf8");
const owner="11111111-1111-4111-8111-111111111111",other="22222222-2222-4222-8222-222222222222";
async function harness(role="client") {
  const writes=[];let status=200,identity=owner,online=false;
  const scope={indexedDB:new IDBFactory(),navigator:{get onLine(){return online;}},Event,fetch:async(url,options)=>{
    if(url==="/api/workspace/identity")return {ok:true,json:async()=>({identity:{id:identity,role}})};
    writes.push(JSON.parse(options.body));return {ok:status===200,status,json:async()=>({error:"Card changed"})};
  }};
  vm.runInNewContext(source,scope);const store=scope.EmberStore;
  await store.identify({id:owner,role});
  return {store,writes,setIdentity:value=>identity=value,setStatus:value=>status=value,online:()=>online=true};
}
const command=(id=owner)=>({action:"create",submissionId:id,clientId:other,subject:"Opening hours",description:"Please update the hours"});
test("offline edits survive, sync once online, and never include credentials",async()=>{
  const t=await harness();await t.store.enqueue(owner,"/api/account/requests",command());await t.store.flush(owner);
  assert.equal(t.writes.length,0);assert.equal((await t.store.pending(owner)).length,1);
  t.online();await t.store.flush(owner);await t.store.flush(owner);
  assert.equal(t.writes.length,1);assert.equal(t.writes[0].submissionId,owner);assert.equal((await t.store.pending(owner)).length,0);
  assert.doesNotMatch(JSON.stringify(t.writes),/access_token|refresh_token|password/);
});
test("retries reuse submissions and reject changed content",async()=>{
  const t=await harness();await t.store.enqueue(owner,"/api/account/requests",command());await t.store.enqueue(owner,"/api/account/requests",command());
  assert.equal((await t.store.pending(owner)).length,1);
  await assert.rejects(t.store.enqueue(owner,"/api/account/requests",{...command(),subject:"Different"}));
  t.online();t.setStatus(503);await t.store.flush(owner);assert.equal((await t.store.pending(owner))[0].state,"pending");
  t.setStatus(200);await t.store.flush(owner);assert.equal(t.writes[0].submissionId,t.writes[1].submissionId);
});
test("a conflict preserves the edit and blocks later writes to that card",async()=>{
  const t=await harness("admin");const payload={action:"edit",seedId:other,title:"Change",brief:"New brief",version:2,submissionId:owner};
  await t.store.enqueue(owner,"/api/admin/pipeline",payload);await t.store.enqueue(owner,"/api/admin/pipeline",{...payload,submissionId:other});
  t.online();t.setStatus(409);await t.store.flush(owner);assert.equal(t.writes.length,1);
  const pending=await t.store.pending(owner);assert.equal(pending.length,2);assert.equal(pending[0].state,"conflict");
  assert.equal(pending[0].payload.brief,"New brief");await t.store.flush(owner);assert.equal(t.writes.length,1);
});
test("another signed-in account cannot upload a previous user's outbox",async()=>{
  const t=await harness();await t.store.enqueue(owner,"/api/account/requests",command());t.online();t.setIdentity(other);await t.store.flush(owner);assert.equal(t.writes.length,0);
  await t.store.cache(owner,"dashboard",{private:true});await t.store.identify({id:other,role:"client"});
  assert.equal(await t.store.cached(owner,"dashboard"),undefined);assert.equal((await t.store.pending(owner)).length,0);
});
test("allocation, agent credentials and account changes cannot queue offline",async()=>{
  const t=await harness("admin");
  for(const [url,payload] of [["/api/admin/pipeline",{...command(),action:"claim"}],["/api/admin/accounts",command()],["/api/admin/pipeline/agents",command()]])await assert.rejects(t.store.enqueue(owner,url,payload));
  await t.store.cache(owner,"dashboard",{private:true});await t.store.enqueue(owner,"/api/account/requests",command());await t.store.clear();
  assert.equal(await t.store.get("identity"),undefined);assert.equal(await t.store.cached(owner,"dashboard"),undefined);assert.equal((await t.store.pending(owner)).length,0);
});
test("revoked staff role cannot upload staff edits",async()=>{
  const t=await harness("client");await t.store.enqueue(owner,"/api/admin/pipeline",{...command(),action:"comment",seedId:other,body:"Internal note"});t.online();await t.store.flush(owner);assert.equal(t.writes.length,0);assert.equal((await t.store.pending(owner)).length,1);
});
