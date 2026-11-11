import test from "node:test";
import assert from "node:assert/strict";
import { sceneFrame, worldTransition } from "../assets/scene-motion.mjs";

test("background worlds blend smoothly at each section boundary and reverse with scroll", () => {
  const samples=[1000,700,400,100,-300].map(top=>worldTransition(top,844));
  assert.equal(samples[0],0);
  assert.equal(samples.at(-1),1);
  for(let i=1;i<samples.length;i++)assert.ok(samples[i]>=samples[i-1]);
  assert.ok(samples[2]>0&&samples[2]<1);
  assert.equal(worldTransition(400,844),samples[2]);
});

test("scrolling advances the scene continuously and reverses on return", () => {
  const positions = [900, 400, 0, -400, -900];
  const frames = positions.map(top => sceneFrame({top,height:900,viewport:900}));
  for(let i=1;i<frames.length;i++) {
    assert.ok(frames[i].progress > frames[i-1].progress);
    assert.ok(frames[i].near < frames[i-1].near);
    assert.ok(frames[i].draw < frames[i-1].draw);
  }
  assert.deepEqual(sceneFrame({top:400,height:900,viewport:900}),frames[1]);
});
test("overscroll and short sections cannot produce unbounded transforms", () => {
  for(const top of [-100000,0,100000]) for(const height of [0,1,50000]) {
    const frame=sceneFrame({top,height,viewport:844});
    assert.ok(Object.values(frame).every(Number.isFinite));
    assert.ok(frame.progress >= 0 && frame.progress <= 1);
    assert.ok(Math.abs(frame.near) <= 165);
    assert.ok(Math.abs(frame.art) <= 62);
  }
});
test("mobile keeps depth with less travel and reduced motion stays static", () => {
  const input={top:-400,height:900,viewport:844};
  assert.ok(Math.abs(sceneFrame({...input,compact:true}).near)<Math.abs(sceneFrame(input).near));
  for(const top of [900,0,-900]) {
    const frame=sceneFrame({...input,top,reduced:true});
    assert.deepEqual([frame.near,frame.far,frame.turn,frame.scale,frame.draw,frame.art],[0,0,-26,1,0,0]);
  }
});
