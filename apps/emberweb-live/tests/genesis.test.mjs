import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = (await readFile(new URL("../galaxy.mjs", import.meta.url), "utf8")).replace(/^import .*;\r?\n/gm,"");

function mount({ gated = true, reduced = false, denied = false, hidden = false, compact = false, saveData = false } = {}) {
  const events = new Map();
  const state = { plays: 0, scrolls: 0, stored: false, focus: null };
  const element = () => ({
    dataset: {}, classList: { add() {}, remove() {} }, style: { setProperty() {} },
    addEventListener(type, fn) { events.set(this.id + ":" + type, fn); },
    focus() { state.focus = this; }
  });
  const elements = Object.fromEntries(["root","stage","entry","film","skip","replay","main","heading","header"].map(id=>[id,Object.assign(element(),{id})]));
  const {root,stage,entry,film,skip,replay,main,heading,header} = elements;
  const classes = new Set(["motion-enabled", ...(gated ? ["cosmos-gated"] : [])]);
  root.classList = { contains:n=>classes.has(n), add:(...n)=>n.forEach(k=>classes.add(k)), remove:(...n)=>n.forEach(k=>classes.delete(k)) };
  entry.hidden = true;
  entry.querySelector = selector => selector === "video" ? film : skip;
  main.querySelector = () => heading;
  film.dataset = {src:'desktop',mobileSrc:'mobile',economySrc:'lite',economyDesktopSrc:'lite-desktop'};
  film.getAttribute = () => film.src;
  film.play = () => { state.plays++; return denied ? Promise.reject(new Error("Autoplay disabled")) : Promise.resolve(); };
  film.pause = () => {};
  const document = {
    hidden, documentElement:root, body:{children:[stage,entry,main,header]}, activeElement:null,
    querySelector:s=>({".galaxy-stage":stage,".universe-entry":entry,".universe-replay":replay,main})[s],
    querySelectorAll:()=>[main,header].filter(el=>el.inert), addEventListener:(k,fn)=>events.set(k,fn), dispatchEvent(){}
  };
  const window = { addEventListener(type, fn){events.set(type,fn);}, scrollTo(){state.scrolls++;} };
  const media = { matches:reduced, addEventListener(){} };
  vm.runInNewContext(source,{window,document,matchMedia:query=>query.includes('max-width') ? {matches:compact,addEventListener(){}} : media,MutationObserver:class{observe(){}},Event:class{},
    requestAnimationFrame:()=>1,setTimeout:fn=>{state.timeout=fn;return 1;},clearTimeout(){},
    navigator:{connection:{saveData}},sessionStorage:{setItem(){state.stored=true;}}});
  return { ...elements, document, state, events, trigger:(type,event)=>events.get(type)?.(event) };
}

test("first arrival starts the film without input and completion releases navigation",()=>{
  const m=mount();
  assert.equal(m.state.plays,1); assert.equal(m.main.inert,true);
  m.trigger("film:ended");
  assert.equal(m.entry.hidden,true); assert.equal(m.main.inert,false); assert.equal(m.state.focus,m.heading);
  assert.equal(m.state.stored,false);
});
for(const event of ["entry:click","entry:wheel","entry:touchmove","film:error"]) {
  test(event+" releases the page during playback",()=>{
    const m=mount(); m.trigger(event); assert.equal(m.main.inert,false); assert.equal(m.entry.hidden,true);
  });
}
test("reduced motion and direct returns bypass the opening",()=>{
  for(const options of [{reduced:true},{gated:false}]) {
    const m=mount(options); assert.equal(m.state.plays,0); assert.equal(m.state.scrolls,0);
  }
});
test("Escape during replay returns focus to replay",()=>{
  const m=mount();m.trigger("film:ended");m.document.activeElement=m.replay;m.trigger("replay:click");
  m.trigger("keydown",{key:"Escape",preventDefault(){}});
  assert.equal(m.state.focus,m.replay);
});
test("stalled and blocked playback both fail open", async()=>{
  const stalled=mount();stalled.state.timeout();assert.equal(stalled.entry.hidden,true);
  const denied=mount({denied:true});await Promise.resolve();await Promise.resolve();assert.equal(denied.entry.hidden,true);
});
test("restoring the homepage from browser history keeps the opening dismissed",()=>{
  const m=mount();m.trigger("film:ended");m.trigger("pageshow",{persisted:true});
  assert.equal(m.state.plays,1);assert.equal(m.entry.hidden,true);
});
test("a background tab pauses and resumes without dismissing the film",()=>{
  const m=mount();m.document.hidden=true;m.trigger("visibilitychange");
  assert.equal(m.entry.hidden,false);m.document.hidden=false;m.trigger("visibilitychange");
  assert.equal(m.state.plays,2);assert.equal(m.entry.hidden,false);
});
const boot=await readFile(new URL("../galaxy-boot.js",import.meta.url),"utf8");
test("direct and external arrivals and reloads play, internal and history returns bypass",()=>{
  const cases = [
    ["", "navigate", true], ["https://example.com/", "navigate", true],
    ["https://emberweb.co.za/work", "navigate", false],
    ["https://emberweb.co.za/work", "reload", true], ["", "back_forward", false],
    ["invalid referrer", "navigate", true]
  ];
  for(const [referrer,type,expected] of cases){
    let gated=false;
    vm.runInNewContext(boot,{URL,performance:{getEntriesByType:()=>[{type}]},location:{origin:"https://emberweb.co.za"},matchMedia:()=>({matches:false}),document:{referrer,documentElement:{classList:{add(){gated=true}}},addEventListener(){}},setTimeout(){return 1},clearTimeout(){}});
    assert.equal(gated,expected,referrer+" "+type);
  }
});

test("opening a homepage in a background tab waits until it becomes visible",()=>{
  const m=mount({hidden:true});assert.equal(m.state.plays,0);assert.equal(m.entry.hidden,false);
  m.document.hidden=false;m.trigger("visibilitychange");assert.equal(m.state.plays,1);
});
test("native playback selects compact and data-saving encodes before requesting media",()=>{
  for(const [options,expected] of [[{},"desktop"],[{compact:true},"mobile"],[{compact:true,saveData:true},"lite"],[{saveData:true},"lite-desktop"]]){
    const m=mount(options);assert.equal(m.film.src,expected);
  }
});
test("playback script does not schedule frames or create a live graphics renderer",()=>{
  assert.doesNotMatch(source,/requestAnimationFrame|createUniverseRenderer|WebGLRenderingContext/);
});
