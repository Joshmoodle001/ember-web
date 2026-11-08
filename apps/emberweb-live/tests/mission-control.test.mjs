import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { AI_EXAMPLES, aiLab, emberGuide } from "../ember-lab.mjs";
import { renderBody } from "../design2-pages.mjs";
const source=await readFile(new URL("../mission-control.js",import.meta.url),"utf8");

function labHarness(hash=""){
  function control(id){return{dataset:{labTarget:"lab-"+id},attributes:new Map(),events:new Map(),setAttribute(name,value){this.attributes.set(name,value);},addEventListener(name,callback){this.events.set(name,callback);},click(){this.events.get("click")?.();}};}
  const buttons=AI_EXAMPLES.map(example=>control(example.id));
  const panels=AI_EXAMPLES.map(example=>({id:"lab-"+example.id,hidden:false}));
  const input={value:"",addEventListener(){},focus(){this.focused=true;}},message={textContent:""},matchButton=control("match");
  const matcher={querySelector:selector=>selector==="input"?input:selector==="button"?matchButton:message};
  const lab={querySelectorAll:selector=>selector==="[data-lab-target]"?buttons:panels,querySelector:selector=>selector==="[data-lab-match]"?matcher:null};
  const document={querySelectorAll:selector=>selector==="[data-ai-lab]"?[lab]:[],querySelector:()=>null};
  let requests=0;
  vm.runInNewContext(source,{document,location:{hash},fetch:()=>{requests++;throw new Error("A local example must not send a request");}});
  return{buttons,panels,input,message,matchButton,get requests(){return requests;}};
}
test("AI examples switch one readable panel and expose the selected button",()=>{
  const h=labHarness();
  for(const button of h.buttons){button.click();assert.equal(h.panels.filter(panel=>!panel.hidden).length,1);assert.equal(h.panels.find(panel=>!panel.hidden).id,button.dataset.labTarget);assert.equal(h.buttons.filter(control=>control.attributes.get("aria-pressed")==="true").length,1);}
  assert.equal(h.requests,0);
});
test("a personal guide link selects the personal example directly",()=>{
  const h=labHarness("#lab-personal");assert.equal(h.panels.find(panel=>!panel.hidden).id,"lab-personal");
  assert.match(emberGuide(),/href="\/ai-lab#lab-personal"/);
});
test("task matching finds a related example without claiming a model response",()=>{
  const h=labHarness();
  for(const [task,id] of [["I spend too long replying to customer enquiries","enquiries"],["I need to find answers in company documents","knowledge"],["I want a personal weekly plan","personal"],["I want to learn Excel formulas","learning"],["We lose the handover between jobs","operations"]]){
    h.input.value=task;h.matchButton.click();assert.equal(h.panels.find(panel=>!panel.hidden).id,"lab-"+id);assert.match(h.message.textContent,/sample content/);
  }
  h.input.value="help";h.matchButton.click();assert.equal(h.input.focused,true);assert.equal(h.requests,0);
});
test("all six examples hand off to an existing service choice and a concrete brief",()=>{
  const choices=[...renderBody("/start").matchAll(/<option value="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(AI_EXAMPLES.length,6);
  for(const example of AI_EXAMPLES){assert.ok(choices.includes(example.service),example.service);assert.ok(example.goal.length>20);assert.ok(example.review.length>30);}
  assert.match(aiLab(),/does not run a live AI model/);
});
