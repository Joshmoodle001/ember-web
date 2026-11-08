import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = (await readFile(new URL("../galaxy.mjs", import.meta.url), "utf8")).replace(/^import .*;\r?\n/gm,"");

function mount({ gated = true, reduced = false, denied = false } = {}) {
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
  film.getAttribute = () => film.src;
  film.play = () => { state.plays++; return denied ? Promise.reject(new Error("Autoplay disabled")) : Promise.resolve(); };
  film.pause = () => {};
  const document = {
    documentElement:root, body:{children:[stage,entry,main,header]}, activeElement:null,
    querySelector:s=>({".galaxy-stage":stage,".universe-entry":entry,".universe-replay":replay,main})[s],
    querySelectorAll:()=>[main,header].filter(el=>el.inert), addEventListener:(k,fn)=>events.set(k,fn), dispatchEvent(){}
  };
  const window = { addEventListener(){}, scrollTo(){state.scrolls++;} };
  const media = { matches:reduced, addEventListener(){} };
  vm.runInNewContext(source,{window,document,matchMedia:()=>media,MutationObserver:class{observe(){}},Event:class{},
    requestAnimationFrame:()=>1,setTimeout:fn=>{state.timeout=fn;return 1;},clearTimeout(){},
    sessionStorage:{setItem(){state.stored=true;}}});
  return { ...elements, document, state, events, trigger:(type,event)=>events.get(type)?.(event) };
}

test("first arrival starts the film without input and completion releases navigation",()=>{
  const m=mount();
  assert.equal(m.state.plays,1); assert.equal(m.main.inert,true);
  m.trigger("film:ended");
  assert.equal(m.entry.hidden,true); assert.equal(m.main.inert,false); assert.equal(m.state.focus,m.heading);
  assert.equal(m.state.stored,true);
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
