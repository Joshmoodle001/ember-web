"use strict";

(() => {
  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const compactScreen = window.matchMedia("(max-width: 760px)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const toggle = document.querySelector(".motion-toggle");
  const toggles = [toggle, document.querySelector(".page-motion-toggle")].filter(Boolean);
  const progress = document.querySelector(".progress");
  const intro = document.body?.dataset?.intro === "off" ? null : document.querySelector(".intro-screen");
  const heroArt = document.querySelector(".hero-art");
  const replay = document.querySelector(".intro-replay");
  let pointer = null;
  let introAnimation;
  let introArrival;
  let introPending = false;
  let introReady = false;
  let introWait = 0;
  let introGeneration = 0;
  let introFinished = false;
  // One complete visible-time sequence on every screen. The hold is linear so
  // the curtain's easing cannot reveal the page before the graphics finish.
  const introDuration = 6400;
  const introRevealAt = 5200;
  const animations = new Map();
  const seen = new WeakSet();
  const visibleDepth = new Set();
  const visibleScenes = new Set();
  let revealObserver;
  let depthObserver;
  let frame = 0;
  let paused = false;
  try { paused = sessionStorage.getItem("ember-motion-paused") === "true"; } catch { /* Optional preference only. */ }
  const enabled = () => !paused && !reducedMotion.matches;

  const groups = [
    ".hero-copy > .eyebrow, .hero-copy .typed-line, .hero-foot > p:first-child, .hero-actions, .hero-reassurance",
    ".journey-heading h2, .journey-heading > p:last-child, .journey-steps > li",
    ".human-copy > h2, .human-copy > p, .human-photo",
    ".service, .vault-intro > h2, .vault-intro > p:last-child, .creative-card",
    ".vault-strip > figure, .qualifier h2, .answers > button, .trust h2, .trust article, .closing h2, .closing-cta",
    ".sub-hero h1, .sub-hero-foot, .concept-grid > article, .industry-grid > article, .care-grid > article, .process-steps article, .process-commitments article, .package-card, .audit-choice, .audit-how article, .page-pulse-grid > article, .route-guide h2",
    ".section-head h2, .section-head > p:last-child, .split-art, .feature-grid > article, .metric-strip > div, .cta-panel h2, .cta-panel .lead",
    ".studio-heading h2, .studio-heading .lead, .capability-card, .solution-card, .workflow-story, .connection-art, .build-options article, .principle-grid article",
  ];
  const targets = [...new Set(groups.flatMap(selector => [...document.querySelectorAll(selector)]))].filter(element => !element.closest?.("[data-galaxy-card], .cosmos-home, body[data-page='/'] .hero"));
  targets.forEach((element, index) => {
    element.dataset.motion = "reveal";
    element.dataset.motionOrder = String(index % 3);
  });
  // Animate the image inside its clipped frame, never the surrounding text.
  const depthTargets = [...document.querySelectorAll(".hero-art, .human-photo > img, .creative-card > img, .closing > img"), ...document.querySelectorAll("[data-art-parallax]")];
  depthTargets.forEach(element => { element.dataset.depth = "true"; });
  const sceneTargets = [...document.querySelectorAll("[data-scroll-scene]")];
  const observedTargets = [...new Set([...depthTargets, ...sceneTargets, ...document.querySelectorAll("[data-ambient], .journey-sigil, .marquee")])];
  const depthSet = new Set(depthTargets);
  const sceneSet = new Set(sceneTargets);
  const sceneProperties = ["--signal-progress", "--signal-turn", "--signal-rise", "--signal-spread", "--signal-core-scale", "--signal-cable", "--signal-shard-y"];
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

  function finishIntro(retry = false) {
    introGeneration += 1;
    introPending = false;
    introReady = false;
    if (introWait) window.clearTimeout(introWait);
    introWait = 0;
    if (intro) intro.hidden = true;
    root.classList.remove("intro-playing");
    root.classList.remove("intro-preparing");
    const animation = introAnimation;
    introAnimation = null;
    animation?.cancel();
    introArrival?.cancel();
    introArrival = null;
    if (retry) introFinished = false;
    if (replay) replay.disabled = !enabled();
  }

  function dismissOpening() {
    const arrival = introArrival;
    introArrival = null;
    arrival?.finish();
    finishIntro();
  }

  function beginIntro(generation) {
    if (generation !== introGeneration || !introPending || !introReady || document.hidden || !enabled()) return;
    introPending = false;
    root.classList.remove("intro-preparing");
    root.classList.add("intro-playing");
    try {
      introAnimation = intro.animate([
        { transform: "translateY(0)", offset: 0 },
        { transform: "translateY(0)", offset: introRevealAt / introDuration, easing: "cubic-bezier(.76,0,.24,1)" },
        { transform: "translateY(-105%)", offset: 1 },
      ], { duration: introDuration, easing: "linear" });
      const currentIntro = introAnimation;
      currentIntro.finished.then(
        () => { if (introAnimation === currentIntro) finishIntro(); },
        () => { if (introAnimation === currentIntro) finishIntro(true); },
      );
      // Own this transition separately: layout/pointer changes only reset ambient motion.
      if (heroArt && typeof heroArt.animate === "function") {
        introArrival = heroArt.animate([{ opacity: .35, scale: ".88", rotate: "-4deg" }, { opacity: 1, scale: "1", rotate: "0deg" }], { duration: 1100, delay: introRevealAt, easing: "cubic-bezier(.22,1,.36,1)" });
        const arrival = introArrival;
        const retire = () => { if (introArrival === arrival) introArrival = null; };
        arrival.finished.then(retire, retire);
      }
    } catch { finishIntro(); }
  }

  function playIntro(explicitReplay = false) {
    if (introAnimation || introPending || (!explicitReplay && introFinished) || !intro || !enabled() || document.hidden || typeof intro.animate !== "function") return;
    introFinished = true;
    introPending = true;
    introReady = false;
    const generation = ++introGeneration;
    intro.hidden = false;
    if (replay) replay.disabled = true;
    root.classList.add("intro-preparing");
    const ready = () => {
      if (generation !== introGeneration || !introPending) return;
      if (introWait) window.clearTimeout(introWait);
      introWait = 0;
      introReady = true;
      beginIntro(generation);
    };
    const assets = [];
    if (document.fonts?.ready) assets.push(document.fonts.ready);
    const image = heroArt?.querySelector?.("img");
    if (typeof image?.decode === "function") {
      try { assets.push(image.decode()); } catch { /* A failed image must not block entry. */ }
    }
    // Let critical assets settle, but never make entry depend on a slow request.
    if (assets.length) {
      introWait = window.setTimeout(ready, 900);
      Promise.allSettled(assets).then(ready);
    } else ready();
  }

  function reveal(element) {
    if (seen.has(element)) return;
    seen.add(element);
    if (!enabled() || typeof element.animate !== "function" || element.contains(document.activeElement)) return;
    const distance = compactScreen.matches ? 12 : 24;
    const animation = element.animate(
      [{ opacity: .25, translate: `0 ${distance}px` }, { opacity: 1, translate: "0 0" }],
      { duration: compactScreen.matches ? 480 : 720, delay: Number(element.dataset.motionOrder) * 65, easing: "cubic-bezier(.22,1,.36,1)" },
    );
    animations.set(animation, element);
    animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
  }

  function updateFrame() {
    frame = 0;
    const viewport = window.innerHeight;
    const limit = compactScreen.matches ? 8 : 28;
    // Read all geometry before writing styles.
    const measurements = enabled() ? [...visibleDepth].map(element => {
      const rect = element.getBoundingClientRect();
      const amount = (viewport / 2 - rect.top - rect.height / 2) / viewport;
      const localLimit = Math.min(limit, Math.max(0, Number(element.dataset.depthLimit) || limit));
      return [element, clamp(amount * localLimit * 2, -localLimit, localLimit)];
    }) : [];
    const scenes = enabled() ? [...visibleScenes].map(element => {
      const rect = element.getBoundingClientRect();
      return [element, clamp((viewport * .2 - rect.top) / Math.max(1, rect.height - viewport * .6), 0, 1)];
    }) : [];
    // Pointer geometry is read in the same frame as scroll geometry, before writes.
    let tiltX = 0, tiltY = 0, lightX = 50, lightY = 50;
    if (pointer && heroArt && visibleDepth.has(heroArt) && enabled() && finePointer.matches && !document.hidden) {
      const rect = heroArt.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const x = Math.max(-1, Math.min(1, (pointer.x - rect.left) / rect.width * 2 - 1));
        const y = Math.max(-1, Math.min(1, (pointer.y - rect.top) / rect.height * 2 - 1));
        tiltX = -y * 4; tiltY = x * 4;
        lightX = (x + 1) * 50; lightY = (y + 1) * 50;
      }
    }
    const scrollable = document.documentElement.scrollHeight - viewport;
    const fraction = scrollable > 0 ? Math.max(0, Math.min(1, window.scrollY / scrollable)) : 0;
    measurements.forEach(([element, amount]) => {
      element.style.setProperty("--depth-shift", `${amount.toFixed(2)}px`);
      if (element === heroArt) {
        element.style.setProperty("--hero-image-y", `${(-amount * 1.3).toFixed(2)}px`);
        element.style.setProperty("--hero-object-y", `${(amount * -1.7).toFixed(2)}px`);
        element.style.setProperty("--hero-orbit-turn", `${(amount * .32).toFixed(2)}deg`);
      }
    });
    scenes.forEach(([element, fraction]) => {
      const spread = compactScreen.matches ? 8 : 70;
      element.dataset.scenePhase = String(Math.min(2, Math.floor(fraction * 3)));
      element.style.setProperty("--signal-progress", fraction.toFixed(4));
      element.style.setProperty("--signal-turn", `${(-18 + fraction * 36).toFixed(2)}deg`);
      element.style.setProperty("--signal-rise", `${((fraction - .5) * (compactScreen.matches ? 12 : 110)).toFixed(2)}px`);
      element.style.setProperty("--signal-spread", `${((fraction - .5) * spread).toFixed(2)}px`);
      element.style.setProperty("--signal-core-scale", (.7 + fraction * .3).toFixed(4));
      element.style.setProperty("--signal-cable", (1 - fraction).toFixed(4));
      element.style.setProperty("--signal-shard-y", `${((fraction - .5) * (compactScreen.matches ? 16 : 160)).toFixed(2)}px`);
    });
    if (heroArt) {
      heroArt.style.setProperty("--art-tilt-x", `${tiltX.toFixed(2)}deg`);
      heroArt.style.setProperty("--art-tilt-y", `${tiltY.toFixed(2)}deg`);
      heroArt.style.setProperty("--art-light-x", `${lightX.toFixed(1)}%`);
      heroArt.style.setProperty("--art-light-y", `${lightY.toFixed(1)}%`);
    }
    if (progress) progress.style.transform = `scaleX(${fraction})`;
  }
  function requestFrame() {
    if (!frame && !document.hidden) frame = window.requestAnimationFrame(updateFrame);
  }

  function configure() {
    if (!enabled()) finishIntro();
    pointer = null;
    revealObserver?.disconnect();
    depthObserver?.disconnect();
    animations.forEach((element, animation) => { animation.cancel(); });
    animations.clear();
    visibleDepth.clear();
    visibleScenes.clear();
    observedTargets.forEach(element => {
      element.style.removeProperty("--depth-shift");
      element.classList.remove("is-motion-active");
    });
    ["--hero-image-y", "--hero-object-y", "--hero-orbit-turn"].forEach(property => heroArt?.style.removeProperty(property));
    sceneTargets.forEach(element => {
      sceneProperties.forEach(property => element.style.removeProperty(property));
      element.dataset.scenePhase = "0";
    });
    root.classList.toggle("motion-enabled", enabled());
    root.classList.toggle("motion-paused", paused);
    root.classList.toggle("motion-background", document.hidden);
    toggles.forEach(control => {
      control.hidden = reducedMotion.matches;
      control.setAttribute("aria-pressed", String(paused));
      control.textContent = paused ? "Resume motion" : "Pause motion";
    });
    if (replay) { replay.hidden = reducedMotion.matches || !intro; replay.disabled = !enabled() || introPending || Boolean(introAnimation); }
    if (enabled() && "IntersectionObserver" in window) {
      revealObserver = new IntersectionObserver(entries => {
        if (!enabled()) return;
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          reveal(entry.target);
          revealObserver.unobserve(entry.target);
        });
      }, { threshold: .08, rootMargin: "0px 0px -24px 0px" });
      targets.filter(element => !seen.has(element)).forEach(element => revealObserver.observe(element));
      depthObserver = new IntersectionObserver(entries => {
        if (!enabled()) return;
        entries.forEach(entry => {
          for (const [targets, visible] of [[depthSet, visibleDepth], [sceneSet, visibleScenes]]) {
            if (!targets.has(entry.target)) continue;
            if (entry.isIntersecting) visible.add(entry.target);
            else visible.delete(entry.target);
          }
          entry.target.classList.toggle("is-motion-active", entry.isIntersecting);
        });
        requestFrame();
      });
      observedTargets.forEach(element => depthObserver.observe(element));
    }
    requestFrame();
  }

  toggles.forEach(control => control.addEventListener("click", () => {
    paused = !paused;
    try { sessionStorage.setItem("ember-motion-paused", String(paused)); } catch { /* Motion still works without storage. */ }
    configure();
  }));
  document.addEventListener("focusin", event => {
    animations.forEach((element, animation) => {
      if (element.contains(event.target)) animation.finish();
    });
  });
  reducedMotion.addEventListener("change", configure);
  finePointer.addEventListener("change", configure);
  replay?.addEventListener("click", () => playIntro(true));
  heroArt?.addEventListener("pointermove", event => {
    if (!enabled() || !finePointer.matches || event.pointerType !== "mouse") return;
    pointer = { x: event.clientX, y: event.clientY };
    requestFrame();
  }, { passive: true });
  const resetPointer = () => { pointer = null; requestFrame(); };
  heroArt?.addEventListener("pointerleave", resetPointer);
  heroArt?.addEventListener("pointercancel", resetPointer);
  window.addEventListener("blur", resetPointer);
  document.addEventListener("keydown", event => {
    if ((event.key === "Escape" || event.key === "Tab") && (introPending || introAnimation)) dismissOpening();
  });
  compactScreen.addEventListener("change", configure);
  window.addEventListener("scroll", requestFrame, { passive: true });
  window.addEventListener("resize", requestFrame, { passive: true });
  document.addEventListener("visibilitychange", () => {
    root.classList.toggle("motion-background", document.hidden);
    if (document.hidden) {
      introAnimation?.pause();
      introArrival?.pause();
      animations.forEach((element, animation) => { animation.finish(); });
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    } else {
      introAnimation?.play();
      introArrival?.play();
      if (introPending && introReady) beginIntro(introGeneration);
      else playIntro();
      requestFrame();
    }
  });
  configure();
  playIntro();
})();
