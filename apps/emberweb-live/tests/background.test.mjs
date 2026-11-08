import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {renderDocument} from "../design2.mjs";
import {renderBody} from "../design2-pages.mjs";
const routes=["/","/work","/portfolio","/packages","/process","/industries","/care","/start","/audit","/book","/policies","/ai-lab","/studio"];
test("each public page uses a unique hero and no repeated background movie",()=>{
 const heroes=routes.map(path=>{
  const html=renderDocument({path,title:"Page"},renderBody(path));
  assert.doesNotMatch(html,/crafted-background-film|ember-intelligence-motion-v1/);
  const hero=html.match(/class="page-artwork"[\s\S]*?<img src="([^"]+)"/)?.[1];
  assert.ok(hero,path);
  assert.ok(fs.existsSync(new URL("../assets"+hero,import.meta.url)),hero);
  return hero;
 });
 assert.equal(new Set(heroes).size,routes.length);
});
test("service and process illustrations are dedicated to their contexts",()=>{
 const work=renderBody("/work"),process=renderBody("/process");
 const services=[...work.matchAll(/<img src="([^"]*service-[^"]+)"/g)].map(m=>m[1]);
 const stages=[...process.matchAll(/class="process-artwork" src="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(services).size,6);
 assert.equal(new Set(stages).size,4);
 for(const asset of [...services,...stages])assert.ok(fs.existsSync(new URL("../assets"+asset,import.meta.url)),asset);
});
