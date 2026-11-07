import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { renderBody } from "../design2-pages.mjs";

const motionSource = await readFile(new URL("../motion.js", import.meta.url), "utf8");
const motionCss = await readFile(new URL("../assets/motion.css", import.meta.url), "utf8");

function createHarness({ reduced = false, compact = false, finePointer = false, hasIntersectionObserver = true, storedPaused = null, storedIntroSeen = null, introPresent = false, initialHidden = false, fontsReady = null, imageReady = null } = {}) {
  const events = [];
  const observers = [];
  const animations = [];
  const frameCallbacks = new Map();
  const timers = new Map();
  let nextTimer = 1;
  const documentListeners = new Map();
  const windowListeners = new Map();
  const storage = new Map();
  if (storedPaused !== null) storage.set("ember-motion-paused", storedPaused);
  if (storedIntroSeen !== null) storage.set("ember-intro-seen", storedIntroSeen);
  let nextFrame = 1;
  let requestCount = 0;

  class FakeClassList {
    constructor() { this.values = new Set(); }
    add(...names) { names.forEach(name => this.values.add(name)); }
    remove(...names) { names.forEach(name => this.values.delete(name)); }
    contains(name) { return this.values.has(name); }
    toggle(name, force) {
      const shouldAdd = force === undefined ? !this.values.has(name) : Boolean(force);
      if (shouldAdd) this.values.add(name);
      else this.values.delete(name);
      return shouldAdd;
    }
  }

  function makeElement(name, rect = { top: 0, height: 100 }) {
    const attributes = new Map();
    const listeners = new Map();
    const styleValues = new Map();
    const element = {
      name,
      dataset: {},
      classList: new FakeClassList(),
      attributes,
      listeners,
      styleValues,
      rect,
      style: {
        setProperty(property, value) {
          events.push({ type: "write", element: name, property });
          styleValues.set(property, value);
        },
        removeProperty(property) {
          events.push({ type: "remove", element: name, property });
          styleValues.delete(property);
        },
      },
      contains(target) { return target === element || target?.parent === element; },
      focus(options) {
        element.focusCount = (element.focusCount ?? 0) + 1;
        element.focusOptions = options;
        document.activeElement = element;
      },
      getBoundingClientRect() {
        events.push({ type: "read", element: name });
        return element.rect;
      },
      addEventListener(type, callback) { listeners.set(type, callback); },
      setAttribute(name, value) { attributes.set(name, value); },
      animate(keyframes, timing) {
        let resolveFinished;
        let rejectFinished;
        const finished = new Promise((resolve, reject) => {
          resolveFinished = resolve;
          rejectFinished = reject;
        });
        const animation = {
          keyframes,
          timing,
          cancelCount: 0,
          finishCount: 0,
          pauseCount: 0,
          playCount: 0,
          playState: "running",
          finished,
          cancel() {
            this.cancelCount += 1;
            this.playState = "idle";
            rejectFinished(new Error("Animation cancelled by test harness."));
          },
          finish() {
            this.finishCount += 1;
            this.playState = "finished";
            resolveFinished(this);
          },
          pause() { this.pauseCount += 1; this.playState = "paused"; },
          play() { this.playCount += 1; this.playState = "running"; },
          resolveFinished() { this.playState = "finished"; resolveFinished(this); },
          rejectFinished() { rejectFinished(new Error("The browser interrupted this animation.")); },
        };
        animations.push({ element, animation });
        return animation;
      },
    };
    return element;
  }

  const revealTarget = makeElement("reveal-target");
  const depthTargets = [
    makeElement("hero-art", { left: 100, top: -10000, width: 200, height: 100 }),
    makeElement("depth-low", { top: 10000, height: 100 }),
  ];
  const heroArt = depthTargets[0];
  heroArt.querySelector = () => imageReady ? { decode: () => imageReady } : null;
  const toggle = makeElement("motion-toggle");
  const globalToggle = makeElement("page-motion-toggle");
  const scene = makeElement("scroll-scene", { top: 200, height: 2000 });
  const preview = makeElement("preview", { top: -10000, height: 300 });
  preview.dataset.depthLimit = "10";
  const ambient = makeElement("ambient");
  toggle.hidden = false;
  toggle.textContent = "";
  const progress = makeElement("progress");
  const intro = introPresent ? makeElement("intro-screen") : null;
  if (intro) intro.hidden = true;
  const replay = introPresent ? makeElement("intro-replay") : null;
  if (replay) replay.hidden = true;
  const heroAction = makeElement("hero-action");
  Object.defineProperty(progress.style, "transform", {
    get() { return progress.styleValues.get("transform"); },
    set(value) {
      events.push({ type: "write", element: "progress", property: "transform" });
      progress.styleValues.set("transform", value);
    },
  });

  function mediaQuery(matches) {
    const listeners = new Set();
    return {
      matches,
      addEventListener(type, callback) { if (type === "change") listeners.add(callback); },
      dispatchChange() { for (const callback of listeners) callback({ matches: this.matches }); },
    };
  }
  const reducedQuery = mediaQuery(reduced);
  const compactQuery = mediaQuery(compact);
  const finePointerQuery = mediaQuery(finePointer);

  class FakeIntersectionObserver {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      this.observed = [];
      this.unobserved = [];
      this.disconnected = false;
      observers.push(this);
    }
    observe(element) { this.observed.push(element); }
    unobserve(element) { this.unobserved.push(element); }
    disconnect() { this.disconnected = true; }
    trigger(entries) { this.callback(entries, this); }
  }

  const root = makeElement("document-root");
  root.scrollHeight = 3000;
  const document = {
    documentElement: root,
    activeElement: makeElement("active-element"),
    hidden: initialHidden,
    ...(fontsReady ? { fonts: { ready: fontsReady } } : {}),
    querySelector(selector) {
      if (selector === ".motion-toggle") return toggle;
      if (selector === ".page-motion-toggle") return globalToggle;
      if (selector === ".progress") return progress;
      if (selector === ".intro-screen") return intro;
      if (selector === ".intro-replay") return replay;
      if (selector === ".hero-art") return heroArt;
      if (selector === ".hero-actions a") return heroAction;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === ".hero-art, .human-photo > img, .creative-card > img, .closing > img") return depthTargets;
      if (selector === "[data-art-parallax]") return [preview];
      if (selector === "[data-scroll-scene]") return [scene];
      if (selector === "[data-ambient], .journey-sigil, .marquee") return [ambient];
      return [revealTarget];
    },
    addEventListener(type, callback) { documentListeners.set(type, callback); },
  };
  const window = {
    innerHeight: 1000,
    scrollY: 1000,
    matchMedia(query) {
      if (query.includes("prefers-reduced-motion")) return reducedQuery;
      if (query.includes("pointer: fine")) return finePointerQuery;
      return compactQuery;
    },
    requestAnimationFrame(callback) {
      const id = nextFrame++;
      requestCount += 1;
      frameCallbacks.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) { frameCallbacks.delete(id); },
    setTimeout(callback, delay) { const id = nextTimer++; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    addEventListener(type, callback) {
      const current = windowListeners.get(type) ?? [];
      current.push(callback);
      windowListeners.set(type, current);
    },
  };
  if (hasIntersectionObserver) window.IntersectionObserver = FakeIntersectionObserver;
  const sessionStorage = {
    getItem(key) { return storage.get(key) ?? null; },
    setItem(key, value) { storage.set(key, value); },
  };
  const sandbox = { document, window, sessionStorage, IntersectionObserver: FakeIntersectionObserver };
  vm.runInNewContext(motionSource, sandbox, { filename: "motion.js" });

  return {
    animations,
    ambient,
    globalToggle,
    scene,
    preview,
    compactQuery,
    depthTargets,
    document,
    documentListeners,
    events,
    flushFrames() {
      const pending = [...frameCallbacks.values()];
      frameCallbacks.clear();
      pending.forEach(callback => callback());
    },
    frameCount: () => frameCallbacks.size,
    timers,
    flushTimers() { const pending = [...timers.values()]; timers.clear(); pending.forEach(timer => timer.callback()); },
    observers,
    finePointerQuery,
    intro,
    heroArt,
    heroAction,
    replay,
    progress,
    reducedQuery,
    requestCount: () => requestCount,
    revealTarget,
    root,
    storage,
    toggle,
    window,
    windowListeners,
  };
}

function assertContentNotHiddenByMotion(elements) {
  for (const element of elements) {
    assert.equal(element.styleValues.has("opacity"), false, element.name + " must not be hidden by the motion controller");
    assert.equal(element.styleValues.has("visibility"), false, element.name + " must remain visible");
    assert.equal(element.styleValues.has("display"), false, element.name + " must remain available");
  }
}

test("reduced-motion startup and missing IntersectionObserver leave content visible", () => {
  const reduced = createHarness({ reduced: true });
  assert.equal(reduced.root.classList.contains("motion-enabled"), false);
  assert.equal(reduced.toggle.hidden, true);
  assert.equal(reduced.observers.length, 0);
  assertContentNotHiddenByMotion([reduced.revealTarget, ...reduced.depthTargets]);

  const unsupported = createHarness({ hasIntersectionObserver: false });
  assert.equal(unsupported.root.classList.contains("motion-enabled"), true);
  assert.equal(unsupported.observers.length, 0);
  assert.equal(unsupported.animations.length, 0);
  assertContentNotHiddenByMotion([unsupported.revealTarget, ...unsupported.depthTargets]);
  assert.doesNotMatch(motionCss, /\[data-motion[^\]]*\][^{]*\{[^}]*opacity\s*:\s*0/is);
});

test("session preference initializes paused state and toggle updates the preference", () => {
  const harness = createHarness({ storedPaused: "true" });
  assert.equal(harness.root.classList.contains("motion-paused"), true);
  assert.equal(harness.root.classList.contains("motion-enabled"), false);
  assert.equal(harness.toggle.attributes.get("aria-pressed"), "true");
  assert.equal(harness.toggle.textContent, "Resume motion");
  assert.equal(harness.observers.length, 0);

  harness.toggle.listeners.get("click")();
  assert.equal(harness.storage.get("ember-motion-paused"), "false");
  assert.equal(harness.toggle.attributes.get("aria-pressed"), "false");
  assert.equal(harness.toggle.textContent, "Pause motion");
  assert.equal(harness.root.classList.contains("motion-enabled"), true);
  assert.equal(harness.observers.length, 2);

  harness.toggle.listeners.get("click")();
  assert.equal(harness.storage.get("ember-motion-paused"), "true");
  assert.equal(harness.root.classList.contains("motion-paused"), true);
  assert.equal(harness.observers[0].disconnected, true);
  assert.equal(harness.observers[1].disconnected, true);
});

test("reveal runs once per element and focus finishes its active animation", () => {
  const harness = createHarness();
  const revealObserver = harness.observers[0];
  revealObserver.trigger([{ target: harness.revealTarget, isIntersecting: true }]);
  assert.equal(harness.animations.length, 1);
  assert.equal(revealObserver.unobserved.length, 1);
  assert.equal(harness.animations[0].animation.timing.duration, 720);

  revealObserver.trigger([{ target: harness.revealTarget, isIntersecting: true }]);
  assert.equal(harness.animations.length, 1, "an already revealed element must not animate again");

  const focusedChild = { parent: harness.revealTarget };
  harness.documentListeners.get("focusin")({ target: focusedChild });
  assert.equal(harness.animations[0].animation.finishCount, 1, "keyboard focus should finish the active reveal");
});

test("a dynamic reduced-motion change cancels animations, clears depth and disconnects observers", () => {
  const harness = createHarness();
  harness.flushFrames();
  harness.observers[0].trigger([{ target: harness.revealTarget, isIntersecting: true }]);
  harness.observers[1].trigger([{ target: harness.depthTargets[0], isIntersecting: true }]);
  harness.flushFrames();
  assert.equal(harness.depthTargets[0].styleValues.has("--depth-shift"), true);

  harness.reducedQuery.matches = true;
  harness.reducedQuery.dispatchChange();

  assert.equal(harness.animations[0].animation.cancelCount, 1);
  assert.equal(harness.observers[0].disconnected, true);
  assert.equal(harness.observers[1].disconnected, true);
  assert.equal(harness.root.classList.contains("motion-enabled"), false);
  assert.equal(harness.toggle.hidden, true);
  assert.equal(harness.depthTargets[0].styleValues.has("--depth-shift"), false);
  assert.equal(harness.depthTargets[0].classList.contains("is-motion-active"), false);
});

test("depth geometry is read in one animation frame and bounded on desktop and mobile", () => {
  const desktop = createHarness();
  desktop.flushFrames();
  desktop.events.length = 0;
  const requestCountBefore = desktop.requestCount();
  desktop.observers[1].trigger(desktop.depthTargets.map(target => ({ target, isIntersecting: true })));
  desktop.windowListeners.get("scroll").forEach(callback => callback());
  desktop.windowListeners.get("resize").forEach(callback => callback());
  assert.equal(desktop.requestCount() - requestCountBefore, 1, "scroll and resize should coalesce with the observer update");
  assert.equal(desktop.frameCount(), 1);
  desktop.flushFrames();

  const reads = desktop.events.filter(event => event.type === "read");
  const writes = desktop.events.filter(event => event.type === "write");
  assert.deepEqual(reads.map(event => event.element), ["hero-art", "depth-low"]);
  assert.ok(desktop.events.findIndex(event => event.type === "read") < desktop.events.findIndex(event => event.type === "write"));
  assert.ok(desktop.events.findLastIndex(event => event.type === "read") < desktop.events.findIndex(event => event.type === "write"), "all geometry reads should precede style writes");
  assert.equal(desktop.depthTargets[0].styleValues.get("--depth-shift"), "28.00px");
  assert.equal(desktop.depthTargets[1].styleValues.get("--depth-shift"), "-28.00px");
  assert.equal(desktop.progress.styleValues.get("transform"), "scaleX(0.5)");
  assert.ok(writes.some(event => event.element === "progress"));

  const mobile = createHarness({ compact: true });
  mobile.flushFrames();
  mobile.observers[1].trigger([{ target: mobile.depthTargets[0], isIntersecting: true }]);
  mobile.flushFrames();
  assert.equal(mobile.depthTargets[0].styleValues.get("--depth-shift"), "8.00px");
});

const settle = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
};

test("the decorative opening has no visible or focusable Skip control", () => {
  const home = renderBody("/");
  const intro = home.match(/<div class="intro-screen"[\s\S]+?<section/)[0];
  assert.doesNotMatch(intro, /intro-skip|Skip intro/);
  assert.match(intro, /aria-hidden="true"/);
  assert.doesNotMatch(intro, /<button|<a\s|tabindex="0"/);
});

test("every fresh homepage receives a complete opening, including old seen sessions", async () => {
  for (const compact of [false, true]) {
    const harness = createHarness({ introPresent: true, compact, storedIntroSeen: "true" });
    assert.equal(harness.intro.hidden, false);
    assert.equal(harness.root.classList.contains("intro-playing"), true);
    assert.equal(harness.animations.length, 2, "curtain and artwork arrival should start together");
    const curtain = harness.animations[0].animation;
    assert.equal(curtain.timing.duration, 6400, "mobile and desktop receive the full paced sequence");
    assert.equal(curtain.timing.easing, "linear", "global easing must not shorten the brand hold");
    assert.equal(curtain.keyframes[1].offset * curtain.timing.duration, 5200, "all graphics settle before the 1.2-second reveal");
    assert.equal(harness.animations[1].animation.timing.delay, 5200, "hero arrival starts with the final reveal");
    assert.ok(harness.animations[1].animation.timing.delay + harness.animations[1].animation.timing.duration <= curtain.timing.duration, "the artwork must be ready before the opening completes");
    curtain.resolveFinished();
    await settle();
    assert.equal(harness.intro.hidden, true);
    assert.equal(harness.root.classList.contains("intro-playing"), false);
    harness.document.hidden = true;
    harness.documentListeners.get("visibilitychange")();
    harness.document.hidden = false;
    harness.documentListeners.get("visibilitychange")();
    assert.equal(harness.animations.length, 2, "returning to a completed page must not start the opening again");
  }
});

test("reduced motion and a saved pause keep the opening and replay inactive", () => {
  const reduced = createHarness({ introPresent: true, reduced: true });
  const paused = createHarness({ introPresent: true, storedPaused: "true" });
  for (const harness of [reduced, paused]) {
    assert.equal(harness.intro.hidden, true);
    assert.equal(harness.root.classList.contains("intro-playing"), false);
    assert.equal(harness.animations.length, 0);
    assert.equal(harness.replay.disabled, true);
  }
  assert.equal(reduced.replay.hidden, true);
  assert.equal(paused.replay.hidden, false);
});

test("rotation and pointer changes preserve the same running intro and hero arrival", () => {
  const harness = createHarness({ introPresent: true });
  const curtain = harness.animations[0].animation;
  const arrival = harness.animations[1].animation;
  harness.compactQuery.matches = true;
  harness.compactQuery.dispatchChange();
  harness.finePointerQuery.matches = true;
  harness.finePointerQuery.dispatchChange();
  assert.equal(harness.intro.hidden, false);
  assert.equal(harness.animations.filter(item => item.element === harness.intro).length, 1);
  assert.equal(curtain.cancelCount, 0);
  assert.equal(arrival.cancelCount, 0);
  assert.equal(harness.replay.disabled, true);
});

test("backgrounding pauses and resumes the same opening without consuming it", () => {
  const harness = createHarness({ introPresent: true });
  const curtain = harness.animations[0].animation;
  const arrival = harness.animations[1].animation;
  harness.document.hidden = true;
  harness.documentListeners.get("visibilitychange")();
  assert.equal(curtain.pauseCount, 1);
  assert.equal(arrival.pauseCount, 1);
  assert.equal(curtain.cancelCount, 0);
  assert.equal(arrival.cancelCount, 0);
  assert.equal(harness.root.classList.contains("motion-background"), true);
  harness.document.hidden = false;
  harness.documentListeners.get("visibilitychange")();
  assert.equal(curtain.playCount, 1);
  assert.equal(arrival.playCount, 1);
  assert.equal(harness.animations.length, 2);
  assert.equal(harness.intro.hidden, false);
});

test("background resume does not restart a hero arrival that finished before the curtain", async () => {
  const harness = createHarness({ introPresent: true });
  const curtain = harness.animations[0].animation;
  const arrival = harness.animations[1].animation;
  arrival.resolveFinished();
  await settle();
  assert.equal(harness.intro.hidden, false, "the curtain is still completing its exit");
  harness.document.hidden = true;
  harness.documentListeners.get("visibilitychange")();
  harness.document.hidden = false;
  harness.documentListeners.get("visibilitychange")();
  assert.equal(curtain.pauseCount, 1);
  assert.equal(curtain.playCount, 1, "the unfinished curtain should resume");
  assert.equal(arrival.pauseCount, 0, "completed artwork must be retired from visibility handling");
  assert.equal(arrival.playCount, 0, "resuming the tab must not restart completed artwork");
  assert.equal(harness.animations.length, 2);
  curtain.resolveFinished();
  await settle();
  assert.equal(harness.intro.hidden, true);
});

test("a page opened in the background defers the intro until it is visible", () => {
  const harness = createHarness({ introPresent: true, initialHidden: true });
  assert.equal(harness.intro.hidden, true);
  assert.equal(harness.animations.length, 0);
  harness.document.hidden = false;
  harness.documentListeners.get("visibilitychange")();
  assert.equal(harness.intro.hidden, false);
  assert.equal(harness.animations.length, 2);
});

test("incidental focus does not cut the intro short, but Escape and Tab remain accessible exits", () => {
  const focused = createHarness({ introPresent: true });
  focused.documentListeners.get("focusin")({ target: focused.heroAction });
  assert.equal(focused.intro.hidden, false);
  assert.equal(focused.animations[0].animation.cancelCount, 0);
  for (const key of ["Escape", "Tab"]) {
    const harness = createHarness({ introPresent: true });
    harness.documentListeners.get("keydown")({ key });
    assert.equal(harness.intro.hidden, true);
    assert.equal(harness.root.classList.contains("intro-playing"), false);
    assert.equal(harness.animations[1].animation.finishCount, 1, "a deliberate accessibility exit should finish the artwork arrival");
  }
});

test("switching reduced motion or explicit Pause clears the opening safely", () => {
  for (const action of ["reduce", "pause"]) {
    const harness = createHarness({ introPresent: true });
    if (action === "reduce") {
      harness.reducedQuery.matches = true;
      harness.reducedQuery.dispatchChange();
    } else harness.toggle.listeners.get("click")();
    assert.equal(harness.intro.hidden, true);
    assert.equal(harness.animations[0].animation.cancelCount, 1);
    assert.equal(harness.animations[1].animation.cancelCount, 1);
    assert.equal(harness.replay.disabled, true);
  }
});

test("replay keeps focus and a stale completion cannot close the newer opening", async () => {
  const harness = createHarness({ introPresent: true });
  harness.animations[0].animation.resolveFinished();
  await settle();
  harness.document.activeElement = harness.replay;
  harness.replay.listeners.get("click")();
  const firstReplay = harness.animations[2].animation;
  assert.equal(harness.document.activeElement, harness.replay);
  assert.equal(harness.replay.disabled, true);
  harness.documentListeners.get("keydown")({ key: "Escape" });
  harness.replay.listeners.get("click")();
  const secondReplay = harness.animations[4].animation;
  await settle();
  assert.equal(firstReplay.cancelCount, 1);
  assert.equal(harness.intro.hidden, false, "the cancelled opening's completion callback must not affect its replacement");
  secondReplay.resolveFinished();
  await settle();
  assert.equal(harness.intro.hidden, true);
  assert.equal(harness.replay.disabled, false);
});

test("the opening waits for fonts and hero decoding, but readiness failures do not trap the page", async () => {
  const fonts = deferred();
  const image = deferred();
  const harness = createHarness({ introPresent: true, fontsReady: fonts.promise, imageReady: image.promise });
  assert.equal(harness.intro.hidden, false);
  assert.equal(harness.root.classList.contains("intro-preparing"), true);
  assert.equal(harness.animations.length, 0);
  fonts.resolve();
  await settle();
  assert.equal(harness.animations.length, 0, "the image is still pending");
  image.reject(new Error("Image decoding unavailable"));
  await settle();
  assert.equal(harness.animations.length, 2, "a failed optional asset must still allow a complete opening");
  assert.equal(harness.root.classList.contains("intro-preparing"), false);
  assert.equal(harness.timers.size, 0);
});

test("asset waiting is bounded and a dismissed readiness callback cannot restart an intro", async () => {
  const pending = deferred();
  const harness = createHarness({ introPresent: true, fontsReady: pending.promise });
  assert.equal(harness.timers.size, 1);
  assert.ok([...harness.timers.values()][0].delay <= 900);
  harness.flushTimers();
  assert.equal(harness.animations.length, 2, "the intro must start when the readiness deadline expires");
  pending.resolve();
  await settle();
  assert.equal(harness.animations.length, 2, "late readiness cannot create duplicate animations");

  const cancelledFonts = deferred();
  const cancelled = createHarness({ introPresent: true, fontsReady: cancelledFonts.promise });
  cancelled.documentListeners.get("keydown")({ key: "Escape" });
  cancelledFonts.resolve();
  await settle();
  cancelled.flushTimers();
  assert.equal(cancelled.animations.length, 0);
  assert.equal(cancelled.intro.hidden, true);
});

test("readiness completed in the background begins only after the page is visible", async () => {
  const fonts = deferred();
  const harness = createHarness({ introPresent: true, fontsReady: fonts.promise });
  harness.document.hidden = true;
  harness.documentListeners.get("visibilitychange")();
  fonts.resolve();
  await settle();
  assert.equal(harness.animations.length, 0);
  harness.document.hidden = false;
  harness.documentListeners.get("visibilitychange")();
  assert.equal(harness.animations.length, 2);
});

test("fine-pointer mouse tilt clamps to four degrees and batches geometry before custom-property writes", () => {
  const harness = createHarness({ introPresent: true, storedIntroSeen: "true", finePointer: true });
  harness.heroArt.rect = { left: 100, top: 50, width: 200, height: 100 };
  harness.flushFrames();
  harness.observers[1].trigger([{ target: harness.heroArt, isIntersecting: true }]);
  harness.flushFrames();
  harness.events.length = 0;

  const before = harness.requestCount();
  const move = harness.heroArt.listeners.get("pointermove");
  move({ pointerType: "mouse", clientX: 300, clientY: 150 });
  move({ pointerType: "mouse", clientX: 100, clientY: 50 });
  harness.windowListeners.get("scroll").forEach(callback => callback());
  harness.windowListeners.get("resize").forEach(callback => callback());
  assert.equal(harness.requestCount() - before, 1, "multiple pointer, scroll and resize events should share one animation frame");
  harness.flushFrames();

  assert.equal(harness.heroArt.styleValues.get("--art-tilt-x"), "4.00deg");
  assert.equal(harness.heroArt.styleValues.get("--art-tilt-y"), "-4.00deg");
  assert.equal(harness.heroArt.styleValues.get("--art-light-x"), "0.0%");
  assert.equal(harness.heroArt.styleValues.get("--art-light-y"), "0.0%");
  const firstWrite = harness.events.findIndex(event => event.type === "write");
  assert.ok(firstWrite > 0);
  assert.ok(harness.events.slice(0, firstWrite).every(event => event.type === "read"), "all geometry should be read before any style write");
  const heroWrites = harness.events.filter(event => event.type === "write" && event.element === "hero-art");
  assert.ok(heroWrites.length > 0);
  assert.ok(heroWrites.every(event => event.property.startsWith("--")), "pointer motion should update CSS custom properties only");

  move({ pointerType: "mouse", clientX: 300, clientY: 150 });
  harness.flushFrames();
  assert.equal(harness.heroArt.styleValues.get("--art-tilt-x"), "-4.00deg");
  assert.equal(harness.heroArt.styleValues.get("--art-tilt-y"), "4.00deg");
  assert.equal(harness.heroArt.styleValues.get("--art-light-x"), "100.0%");
  assert.equal(harness.heroArt.styleValues.get("--art-light-y"), "100.0%");
});

test("pointer leave/cancel reset tilt, while coarse and touch pointers do nothing", () => {
  const fine = createHarness({ introPresent: true, storedIntroSeen: "true", finePointer: true });
  fine.heroArt.rect = { left: 100, top: 50, width: 200, height: 100 };
  fine.flushFrames();
  fine.observers[1].trigger([{ target: fine.heroArt, isIntersecting: true }]);
  fine.flushFrames();
  const move = fine.heroArt.listeners.get("pointermove");
  const assertCentered = () => {
    assert.equal(fine.heroArt.styleValues.get("--art-tilt-x"), "0.00deg");
    assert.equal(fine.heroArt.styleValues.get("--art-tilt-y"), "0.00deg");
    assert.equal(fine.heroArt.styleValues.get("--art-light-x"), "50.0%");
    assert.equal(fine.heroArt.styleValues.get("--art-light-y"), "50.0%");
  };

  for (const resetEvent of ["pointerleave", "pointercancel"]) {
    move({ pointerType: "mouse", clientX: 300, clientY: 150 });
    fine.flushFrames();
    assert.notEqual(fine.heroArt.styleValues.get("--art-tilt-y"), "0.00deg");
    const before = fine.requestCount();
    fine.heroArt.listeners.get(resetEvent)();
    assert.equal(fine.requestCount() - before, 1, resetEvent + " should schedule one reset frame");
    fine.flushFrames();
    assertCentered();
  }

  for (const { finePointer, pointerType } of [
    { finePointer: false, pointerType: "mouse" },
    { finePointer: true, pointerType: "touch" },
  ]) {
    const ignored = createHarness({ introPresent: true, storedIntroSeen: "true", finePointer });
    ignored.heroArt.rect = { left: 100, top: 50, width: 200, height: 100 };
    ignored.flushFrames();
    ignored.observers[1].trigger([{ target: ignored.heroArt, isIntersecting: true }]);
    ignored.flushFrames();
    const before = ignored.requestCount();
    ignored.heroArt.listeners.get("pointermove")({ pointerType, clientX: 300, clientY: 150 });
    assert.equal(ignored.requestCount(), before, pointerType + " input without fine mouse support should schedule no tilt frame");
    assert.equal(ignored.heroArt.styleValues.get("--art-tilt-x"), "0.00deg");
    assert.equal(ignored.heroArt.styleValues.get("--art-tilt-y"), "0.00deg");
  }
});

test("scroll scene progresses through three chapters, clamps at both ends and batches reads", () => {
  const harness = createHarness();
  harness.flushFrames();
  harness.events.length = 0;
  harness.observers[1].trigger([harness.scene, harness.preview, harness.heroArt].map(target => ({ target, isIntersecting: true })));
  harness.flushFrames();
  assert.equal(harness.scene.dataset.scenePhase, "0");
  assert.equal(harness.scene.styleValues.get("--signal-progress"), "0.0000");
  assert.equal(harness.preview.styleValues.get("--depth-shift"), "10.00px", "preview depth respects its smaller local limit");
  assert.ok(harness.events.findLastIndex(event => event.type === "read") < harness.events.findIndex(event => event.type === "write"));
  for (const [top, phase, expected] of [[-500, "1", "0.5000"], [-1200, "2", "1.0000"], [-10000, "2", "1.0000"], [10000, "0", "0.0000"]]) {
    harness.scene.rect.top = top;
    harness.windowListeners.get("scroll").forEach(callback => callback());
    harness.flushFrames();
    assert.equal(harness.scene.dataset.scenePhase, phase);
    assert.equal(harness.scene.styleValues.get("--signal-progress"), expected);
  }
  assert.equal(harness.frameCount(), 0, "motion must not schedule a perpetual animation loop");
});

test("offscreen scenes and ambient art stop being processed; global pause resets all layers", () => {
  const harness = createHarness();
  harness.flushFrames();
  harness.observers[1].trigger([harness.scene, harness.ambient, harness.heroArt].map(target => ({ target, isIntersecting: true })));
  harness.flushFrames();
  assert.equal(harness.ambient.classList.contains("is-motion-active"), true);
  assert.equal(harness.heroArt.styleValues.has("--hero-image-y"), true);
  harness.observers[1].trigger([harness.scene, harness.ambient].map(target => ({ target, isIntersecting: false })));
  harness.flushFrames();
  harness.events.length = 0;
  harness.windowListeners.get("scroll").forEach(callback => callback());
  harness.flushFrames();
  assert.equal(harness.events.some(event => event.type === "read" && event.element === "scroll-scene"), false);
  assert.equal(harness.ambient.classList.contains("is-motion-active"), false);
  harness.globalToggle.listeners.get("click")();
  assert.equal(harness.globalToggle.textContent, "Resume motion");
  assert.equal(harness.toggle.textContent, "Resume motion");
  assert.equal(harness.scene.styleValues.has("--signal-progress"), false);
  assert.equal(harness.heroArt.styleValues.has("--hero-image-y"), false);
  assert.equal(harness.root.classList.contains("motion-enabled"), false);
  assertContentNotHiddenByMotion([harness.scene, harness.preview]);
});

test("hidden tabs suspend CSS motion and do not schedule work until visible", () => {
  const harness = createHarness();
  harness.flushFrames();
  harness.document.hidden = true;
  harness.documentListeners.get("visibilitychange")();
  assert.equal(harness.root.classList.contains("motion-background"), true);
  const requests = harness.requestCount();
  harness.windowListeners.get("scroll").forEach(callback => callback());
  harness.observers[1].trigger([{ target: harness.scene, isIntersecting: true }]);
  assert.equal(harness.requestCount(), requests);
  assert.equal(harness.frameCount(), 0);
  harness.document.hidden = false;
  harness.documentListeners.get("visibilitychange")();
  assert.equal(harness.root.classList.contains("motion-background"), false);
  assert.equal(harness.frameCount(), 1);
  harness.flushFrames();
  assert.equal(harness.scene.styleValues.get("--signal-progress"), "0.0000");
});

test("mobile scroll art stays bounded and reduced motion removes all enhanced scene state", () => {
  const harness = createHarness({ compact: true });
  harness.flushFrames();
  harness.scene.rect.top = -10000;
  harness.observers[1].trigger([harness.scene, harness.preview].map(target => ({ target, isIntersecting: true })));
  harness.flushFrames();
  assert.equal(harness.scene.styleValues.get("--signal-rise"), "6.00px");
  assert.equal(harness.scene.styleValues.get("--signal-shard-y"), "8.00px");
  assert.equal(harness.preview.styleValues.get("--depth-shift"), "8.00px");
  harness.reducedQuery.matches = true;
  harness.reducedQuery.dispatchChange();
  assert.equal(harness.scene.styleValues.has("--signal-progress"), false);
  assert.equal(harness.scene.classList.contains("is-motion-active"), false);
  assert.equal(harness.globalToggle.hidden, true);
});
