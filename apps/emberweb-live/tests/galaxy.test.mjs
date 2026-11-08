import assert from "node:assert/strict";
import test from "node:test";
import { cardFlight, celestialPose, genesisAt, INTRO_DURATION, chapterAt } from "../galaxy-motion.mjs";
import { markGalaxyCards } from "../galaxy-page.mjs";
import { renderDocument } from "../design2.mjs";
import { renderBody } from "../design2-pages.mjs";

test("cards of different heights are completely still and opaque throughout their reading zone", () => {
  for (const viewport of [844, 900, 1080]) for (const height of [100, 250, 550, 1000, 1600]) for (const compact of [true, false]) {
    const center = viewport / 2 - height / 2;
    const flight = cardFlight(center, height, viewport, 3, compact);
    for (const property of ["x", "y", "z", "yaw", "pitch", "roll", "blur"]) assert.ok(Math.abs(flight[property]) < .00001, `${property}: ${height}/${viewport}`);
    assert.equal(flight.scale, 1);
    assert.equal(flight.opacity, 1);
  }
});

test("entry alternates sides, exits only after the last content passes the header, and reverses deterministically", () => {
  const enter = cardFlight(850, 500, 900, 0);
  const opposite = cardFlight(850, 500, 900, 1);
  assert.ok(enter.x < -100 && opposite.x > 100);
  assert.ok(enter.z < -300 && enter.scale < .9);
  const lastLines = cardFlight(-350, 500, 900, 0);
  assert.equal(lastLines.opacity, 1, "last lines still below the header must stay opaque");
  const departed = cardFlight(-550, 500, 900, 0);
  assert.ok(departed.y < 0 && departed.opacity < 1);
  assert.deepEqual(cardFlight(850, 500, 900, 0), enter, "reversing scroll must retrace the same path");
});

test("mobile flight keeps depth and blur disabled with smaller lateral travel", () => {
  const desktop = cardFlight(900, 400, 844, 0);
  const mobile = cardFlight(900, 400, 844, 0, true);
  assert.ok(Math.abs(mobile.x) < Math.abs(desktop.x) / 3);
  assert.equal(mobile.z, 0);
  assert.equal(mobile.blur, 0);
  assert.equal(mobile.yaw, 0);
});

test("the planetary flyby approaches, passes the camera and returns to a distant view", () => {
  assert.equal(celestialPose(0).planetOpacity,0);
  assert.ok(celestialPose(3.15).planetScale>celestialPose(2.45).planetScale);
  assert.ok(celestialPose(3.65).planetX<0);
  assert.equal(celestialPose(4.1).planetOpacity,0);
  assert.ok(celestialPose(4.8).planetScale<.5);
  for(const scene of [-1,0,1.7,2.45,3.15,3.65,4.1,4.8,8])for(const value of Object.values(celestialPose(scene)))assert.ok(Number.isFinite(value));
  assert.deepEqual(celestialPose(-1),celestialPose(0));assert.deepEqual(celestialPose(8),celestialPose(4.8));
});

test("only leaf reading cards get flight marks and only the homepage receives the galaxy", () => {
  const marked = markGalaxyCards(renderBody("/"));
  assert.match(marked, /class="atlas-route[^>]*data-galaxy-card/);
  assert.doesNotMatch(marked, /<(?:main|section)[^>]*data-galaxy-card/);
  const home = renderDocument({path:"/",title:"Home"},renderBody("/"));
  const other = renderDocument({path:"/work",title:"Work"},renderBody("/work"));
  assert.match(home, /class="galaxy-stage"/);
  assert.match(home, /type="module" src="\/galaxy\.mjs/);
  assert.doesNotMatch(other, /galaxy-stage|galaxy\.css|galaxy\.mjs/);
});

test("the opening collapses before its single ignition and completes after the reveal", () => {
  const initial=genesisAt(0),suction=genesisAt(1800),tunnel=genesisAt(2700),birth=genesisAt(3600),end=genesisAt(INTRO_DURATION);
  assert.equal(initial.collapse,0);assert.equal(initial.explosion,0);assert.equal(initial.reveal,0);
  assert.ok(suction.collapse>.9);assert.equal(suction.explosion,0);
  assert.ok(tunnel.tunnel>.9);assert.equal(tunnel.reveal,0);
  assert.equal(birth.explosion,1);assert.ok(birth.expansion>0);assert.equal(birth.reveal,0);
  assert.equal(end.reveal,1);assert.equal(end.complete,true);
  for(let ms=0;ms<=INTRO_DURATION+2000;ms+=50)for(const key of ["collapse","tunnel","explosion","expansion","reveal"])assert.ok(genesisAt(ms)[key]>=0&&genesisAt(ms)[key]<=1);
});

test("the camera gives the full formation scene time and retraces scroll continuously", () => {
  const chapters=[{top:0,scene:0},{top:900,scene:1},{top:4050,scene:2},{top:5800,scene:3},{top:9000,scene:4.8}];
  assert.equal(chapterAt(675,900,chapters),1);
  assert.equal(chapterAt(2250,900,chapters),1.5);
  assert.equal(chapterAt(0,900,[]),0);
  assert.equal(chapterAt(20000,900,chapters),4.8);
  let last=chapterAt(0,900,chapters);
  for(let y=0;y<10000;y+=10){const next=chapterAt(y,900,chapters);assert.ok(next>=last&&next-last<.03);last=next;}
});

test("celestial paths have no discontinuities at scene boundaries", () => {
  let previous=celestialPose(0);
  for(let index=1;index<=4800;index++){
    const next=celestialPose(index/1000);
    for(const key of Object.keys(next))assert.ok(Math.abs(next[key]-previous[key])<1,"camera bodies must not jump");
    previous=next;
  }
});
