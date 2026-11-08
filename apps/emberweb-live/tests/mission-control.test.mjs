import test from "node:test";
import assert from "node:assert/strict";
import { AI_EXAMPLES, aiLab } from "../ember-lab.mjs";
import { renderBody } from "../design2-pages.mjs";

test("each sample is independently readable and can be linked directly",()=>{
  const html = aiLab();
  for(const example of AI_EXAMPLES) {
    assert.ok(html.includes('id="lab-'+example.id+'"'));
    assert.ok(html.includes("<summary>"+example.name+"</summary>"));
  }
  assert.equal((html.match(/<details\b/g)||[]).length,6);
  assert.doesNotMatch(html,/<(?:form|input|iframe)\b/i);
});
test("every example leads to a brief with its selected service and goal",()=>{
  const services = [...renderBody("/start").matchAll(/<option value="([^"]+)"/g)].map(match=>match[1]);
  const links = [...aiLab().matchAll(/href="(\/start\?[^"]+)"/g)].map(match=>new URL(match[1].replaceAll("&amp;","&"),"https://emberweb.co.za"));
  assert.equal(links.length,AI_EXAMPLES.length);
  for(const [index,link] of links.entries()) {
    const service = link.searchParams.get("service");
    assert.ok(services.includes(service));
    assert.equal(service,AI_EXAMPLES[index].service);
    assert.equal(link.searchParams.get("goal"),AI_EXAMPLES[index].goal);
  }
});
