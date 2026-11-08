import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const source=fs.readFileSync(new URL("../experience.js",import.meta.url),"utf8");
const player=source.slice(source.indexOf("(() => {", source.indexOf("request();")));
function setup(saveData=false){
  let gated=true,changed;
  const movie={dataset:{src:"artwork.mp4"},paused:true,play(){this.paused=false;return Promise.resolve()},pause(){this.paused=true},getAttribute(){return this.src},addEventListener(){}};
  const document={hidden:false,documentElement:{classList:{contains:()=>gated}},querySelector:()=>movie,addEventListener(){}};
  vm.runInNewContext(player,{document,navigator:{connection:{saveData}},matchMedia:()=>({matches:false,addEventListener(){}}),MutationObserver:class{constructor(fn){changed=fn}observe(){}},window:{addEventListener(){}}});
  return{movie,release(){gated=false;changed()},hide(){document.hidden=true;changed()}};
}
test("background film waits for the intro to release the page and pauses in a hidden tab",()=>{
 const h=setup();assert.equal(h.movie.src,undefined);h.release();assert.equal(h.movie.src,"artwork.mp4");assert.equal(h.movie.paused,false);h.hide();assert.equal(h.movie.paused,true);
});
test("data-saving mode keeps the poster without downloading the artwork film",()=>{
 const h=setup(true);h.release();assert.equal(h.movie.src,undefined);assert.equal(h.movie.paused,true);
});
