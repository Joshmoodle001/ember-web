import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import * as math from "../galaxy-motion.mjs";
const source=(await readFile(new URL("../galaxy.mjs",import.meta.url),"utf8")).replace(/^import .*;\r?\n/gm,"");

function harness({reduced=false,gated=true,rendererAvailable=true}={}){
  const events=new Map(),windowEvents=new Map(),frames=new Map(),paint=[];
  let nextId=0,now=0,focused=null,scrollCalls=0;
  class Element{
    constructor(){this.dataset={};this.hidden=false;this.inert=false;this.listeners=new Map();this.offsetTop=0;this.offsetHeight=300;this.offsetWidth=500;this.offsetParent=null;this.isConnected=true;const values=new Set();this.classList={add:(...names)=>names.forEach(name=>values.add(name)),remove:(...names)=>names.forEach(name=>values.delete(name)),contains:name=>values.has(name)};this.properties=new Map();this.style={setProperty:(name,value)=>this.properties.set(name,value),removeProperty:name=>this.properties.delete(name)};}
    addEventListener(name,callback){this.listeners.set(name,callback);}
    focus(){focused=this;document.activeElement=this;}
    closest(selector){return selector===".universe-replay"&&this===replay?this:null;}
    click(){this.listeners.get("click")?.({target:this});}
    querySelector(){return null;}
  }
  const root=new Element(),stage=new Element(),entry=new Element(),ignite=new Element(),skip=new Element(),caption=new Element(),main=new Element(),heading=new Element(),header=new Element(),footer=new Element(),replay=new Element(),card=new Element(),chapter=new Element(),label=new Element(),existingInert=new Element();
  root.classList.add("motion-enabled");if(gated)root.classList.add("cosmos-gated");
  entry.hidden=true;existingInert.inert=true;chapter.dataset.cosmosScene="0";chapter.offsetHeight=900;
  card.offsetTop=100;main.querySelector=selector=>selector==="h1"?heading:null;
  stage.querySelector=()=>new Element();
  entry.querySelector=selector=>({".universe-ignite":ignite,".universe-skip":skip,".entry-caption":caption})[selector];
  const elements={".galaxy-stage":stage,".universe-entry":entry,".universe-replay":replay,"#main-content":main,".cosmos-formation":null,".cosmos-close-pass":null,".ember-homeworld":null,".cosmos-chapter":label};
  const children=[stage,entry,header,main,footer,existingInert];
  const document={documentElement:root,body:{children},hidden:false,activeElement:null,
    querySelector:selector=>elements[selector]||null,
    querySelectorAll:selector=>selector==="[data-galaxy-card]"?[card]:selector==="[data-cosmos-scene]"?[chapter]:selector==="[data-cosmos-inert]"?children.filter(element=>Object.hasOwn(element.dataset,"cosmosInert")):[],
    addEventListener:(name,callback)=>{if(!events.has(name))events.set(name,[]);events.get(name).push(callback);},
    dispatchEvent:event=>events.get(event.type)?.forEach(callback=>callback(event)),
  };
  const media={reduced:{matches:reduced,addEventListener(name,callback){this.change=callback;}},compact:{matches:false,addEventListener(){}}};
  const context={...math,document,innerWidth:1440,innerHeight:900,
    window:{scrollY:0,scrollTo:()=>scrollCalls++,addEventListener:(name,callback)=>windowEvents.set(name,callback)},
    matchMedia:query=>query.includes("reduced")?media.reduced:media.compact,
    requestAnimationFrame:callback=>{const id=++nextId;frames.set(id,callback);return id;},cancelAnimationFrame:id=>frames.delete(id),
    performance:{now:()=>now},Event:class{constructor(type){this.type=type;}},
    MutationObserver:class{constructor(callback){this.callback=callback;}observe(){context.mutate=this.callback;}},
    createUniverseRenderer:(a,b,failure)=>{if(!rendererAvailable)failure();return{renderer:rendererAvailable?"webgl-procedural":"canvas-fallback",resize(){},draw:state=>paint.push({...state})};},
  };
  vm.runInNewContext(source,context);
  function advance(ms){for(let amount=0;amount<ms;amount+=16){now+=16;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(callback=>callback(now));}}
  const dispatch=(name,event={})=>events.get(name)?.forEach(callback=>callback(event));
  return{root,stage,entry,ignite,skip,caption,main,heading,header,footer,replay,card,existingInert,document,media,context,advance,dispatch,paint,frames,get focused(){return focused;},get scrollCalls(){return scrollCalls;}};
}

test("the universe waits for a deliberate click and isolates only the page behind the dialog",()=>{
  const h=harness();h.advance(1000);
  assert.equal(h.stage.dataset.intro,"idle");assert.equal(h.entry.hidden,false);assert.equal(h.focused,h.ignite);
  assert.equal(h.header.inert,true);assert.equal(h.main.inert,true);assert.equal(h.existingInert.inert,true);
  assert.ok(h.paint.every(state=>state.collapse===0));
});
test("one click runs the complete collapse, ignition and reveal, then returns to the top",()=>{
  const h=harness();h.ignite.click();h.ignite.click();h.advance(6400);
  assert.equal(h.entry.hidden,true);assert.equal(h.stage.dataset.intro,"complete");
  assert.equal(h.root.classList.contains("cosmos-gated"),false);assert.equal(h.main.inert,false);
  assert.equal(h.existingInert.inert,true,"pre-existing inert regions must remain inert");
  assert.equal(h.focused,h.heading);assert.ok(h.scrollCalls>=2);
  assert.ok(h.paint.some(state=>state.collapse>.9&&state.explosion===0));
  assert.ok(h.paint.some(state=>state.explosion===1&&state.expansion>.5));
});
test("hidden time does not consume the cinematic sequence",()=>{
  const h=harness();h.ignite.click();h.advance(1600);const before=h.paint.at(-1).collapse;
  h.document.hidden=true;h.dispatch("visibilitychange");h.advance(20000);
  assert.equal(h.frames.size,0);assert.equal(h.paint.at(-1).collapse,before);
  h.document.hidden=false;h.dispatch("visibilitychange");h.advance(32);
  assert.ok(h.paint.at(-1).collapse-before<.05);assert.equal(h.entry.hidden,false);
});
test("Escape and Skip release the page, and replay restores focus to its trigger",()=>{
  const h=harness();h.ignite.click();h.advance(400);h.dispatch("keydown",{key:"Escape",preventDefault(){}});
  assert.equal(h.entry.hidden,true);assert.equal(h.header.inert,false);
  h.document.activeElement=h.replay;h.replay.click();assert.equal(h.entry.hidden,false);
  h.skip.click();assert.equal(h.entry.hidden,true);assert.equal(h.focused,h.replay);
});
test("reduced motion bypasses the film, and a pause during playback finishes safely",()=>{
  const reduced=harness({reduced:true});reduced.advance(32);assert.equal(reduced.entry.hidden,true);assert.equal(reduced.main.inert,false);
  const paused=harness();paused.ignite.click();paused.advance(500);paused.root.classList.remove("motion-enabled");paused.context.mutate();paused.advance(32);
  assert.equal(paused.entry.hidden,true);assert.equal(paused.main.inert,false);assert.equal(paused.card.classList.contains("is-galaxy-active"),false);
});
test("a missing WebGL renderer still leaves a working entry and readable website",()=>{
  const h=harness({rendererAvailable:false});h.ignite.click();h.advance(6400);
  assert.equal(h.stage.dataset.fallback,"true");assert.equal(h.entry.hidden,true);assert.equal(h.main.inert,false);
});
test("direct chapter links preserve the browser's anchor position",()=>{
  const h=harness({gated:false});h.advance(32);assert.equal(h.scrollCalls,0);assert.equal(h.entry.hidden,true);
});
