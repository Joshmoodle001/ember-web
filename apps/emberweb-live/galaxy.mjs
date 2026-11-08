import { chapterAt } from "./galaxy-motion.mjs?v=studio-film";
import { createUniverseRenderer } from "./galaxy-renderer.mjs?v=studio-film";

const stage = document.querySelector(".galaxy-stage");
const entry = document.querySelector(".universe-entry");
const film = entry.querySelector("video");
const skip = entry.querySelector(".universe-skip");
const replay = document.querySelector(".universe-replay");
const root = document.documentElement;
const main = document.querySelector("main");
const heading = main.querySelector("h1");
const compact = matchMedia("(max-width: 760px)");
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const moving = () => !reduced.matches && root.classList.contains("motion-enabled");

let session = 0;
let returnFocus;
let deadline;
let renderer;
let frame = 0;
let lastPaint = 0;
let geometry = [];

let needsMeasure = true;

function finishIntro() {
  if (entry.hidden) return;
  session++;
  clearTimeout(deadline);
  entry.hidden = true;
  film.pause();
  root.classList.remove("cosmos-gated", "cosmos-opening");
  for (const element of document.querySelectorAll("[data-cosmos-inert]")) {
    element.inert = false;
    delete element.dataset.cosmosInert;
  }
  try { sessionStorage.setItem("ember:visited-atlas", "1"); } catch {}
  heading.tabIndex = -1;
  (returnFocus || heading).focus({ preventScroll: true });
  requestPaint();
}

function playIntro() {
  if (!moving()) {
    root.classList.remove("cosmos-gated");
    requestPaint();
    return;
  }
  const generation = ++session;
  returnFocus = document.activeElement === replay ? replay : null;
  for (const element of document.body.children) {
    if (element === entry || element === stage || element.inert || element.tagName === "SCRIPT") continue;
    element.inert = true;
    element.dataset.cosmosInert = "";
  }
  window.scrollTo({ top: 0, behavior: "instant" });
  entry.classList.remove("film-playing");
  entry.hidden = false;
  root.classList.add("cosmos-gated", "cosmos-opening");
  skip.focus({ preventScroll: true });
  if (!film.getAttribute("src")) film.src = compact.matches ? film.dataset.mobileSrc : film.dataset.src;
  film.currentTime = 0;
  // A stalled stream must never leave the visitor behind the opening.
  deadline = setTimeout(finishIntro, 8000);
  film.play().catch(() => { if (session === generation) finishIntro(); });
}

function measure() {
  renderer.resize(innerWidth, innerHeight, compact.matches);
  const box = element => {
    let top = 0;
    for (let node = element; node; node = node.offsetParent) top += node.offsetTop;
    return { element, top, height: element.offsetHeight };
  };
  geometry = [...main.querySelectorAll("[data-cosmos-scene]")].map(element => ({
    ...box(element), scene: Number(element.dataset.cosmosScene)
  }));
  needsMeasure = false;
}
let previousScroll = -1;
let previousMotion;
function paint(now) {
  frame = 0;
  if (document.hidden || !entry.hidden) return;
  if (!renderer) {
    renderer = createUniverseRenderer(stage.querySelector(".universe-canvas"), stage.querySelector(".universe-particles"), () => { stage.dataset.fallback = "true"; });
  }
  const resized = needsMeasure;
  if (resized) measure();
  const active = moving();
  const changed = resized || scrollY !== previousScroll || active !== previousMotion;
  const scene = chapterAt(scrollY, innerHeight, geometry);
  if (changed || now - lastPaint >= (compact.matches ? 60 : 42)) {
    renderer.draw({ time: active ? now / 1000 : 0, scene: 1.72 + scene * .65, pointerX: 0, pointerY: 0, velocity: 0, entry: 0, reveal: 1, collapse: 0, tunnel: 0, explosion: 0, expansion: 0 });
    lastPaint = now;
  }
  previousScroll = scrollY;
  previousMotion = active;
  if (active && !compact.matches) requestPaint();
}
function requestPaint() {
  if (!frame && entry.hidden && !document.hidden) frame = requestAnimationFrame(paint);
}
entry.addEventListener("click", finishIntro);
entry.addEventListener("wheel", finishIntro, { passive: true });
entry.addEventListener("touchmove", finishIntro, { passive: true });
film.addEventListener("playing", () => entry.classList.add("film-playing"));
film.addEventListener("ended", finishIntro);
film.addEventListener("error", finishIntro);
film.addEventListener("timeupdate", () => {
  if (Number.isFinite(film.duration)) root.style.setProperty("--film-arrival", Math.min(1, Math.max(0, 1 - (film.duration - film.currentTime) / .55)));
});
replay.addEventListener("click", () => {
  root.style.setProperty("--film-arrival", "0");
  playIntro();
});
document.addEventListener("keydown", event => {
  if (entry.hidden) return;
  if (event.key === "Tab") { event.preventDefault(); skip.focus(); return; }
  if (["Escape","Enter"," ","ArrowDown","PageDown"].includes(event.key)) { event.preventDefault(); finishIntro(); }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) finishIntro(); else requestPaint();
});
function updateMotion() {
  if (!moving()) finishIntro();
  requestPaint();
}
new MutationObserver(updateMotion).observe(root, { attributes: true, attributeFilter: ["class"] });
reduced.addEventListener("change", updateMotion);
window.addEventListener("scroll", requestPaint, { passive: true });
window.addEventListener("resize", () => { needsMeasure = true; requestPaint(); });
window.addEventListener("pageshow", requestPaint);
document.fonts?.ready.then(() => { needsMeasure = true; requestPaint(); });
if (root.classList.contains("cosmos-gated")) playIntro(); else requestPaint();
document.dispatchEvent(new Event("ember:cosmos-ready"));
