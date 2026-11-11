const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Blend the next world across the viewport as its section reaches the reader.
export function worldTransition(top, viewport) {
  const progress = clamp((viewport * 1.05 - top) / Math.max(1, viewport * .9), 0, 1);
  return progress * progress * (3 - 2 * progress);
}

// One scroll driver for decorative layers. Values remain bounded on short/long pages.
export function sceneFrame({ top, height, viewport, compact = false, reduced = false }) {
  const progress = clamp((viewport - top) / Math.max(1, viewport + height), 0, 1);
  const travel = reduced ? 0 : progress - .5;
  return {
    progress,
    near: reduced ? 0 : travel * (compact ? -150 : -330),
    far: travel * (compact ? 45 : 110),
    turn: -26 + travel * (reduced ? 0 : 94),
    scale: reduced ? 1 : .78 + progress * .48,
    draw: reduced ? 0 : 100 - progress * 155,
    art: reduced ? 0 : clamp(-top * (compact ? .065 : .105), compact ? -32 : -62, 62),
  };
}

function sceneMarkup(index, economical) {
  const id = `signal-colour-${index}`;
  const fragments = Array.from({ length: economical ? 4 : 7 }, (_, i) =>
    `<i class="signal-fragment fragment-${i}" style="--fragment-index:${i}"></i>`).join("");
  return `<div class="signal-aura"></div>
    <div class="signal-far"><div class="signal-orbit orbit-outer"></div><div class="signal-orbit orbit-inner"></div></div>
    <svg class="signal-ribbons" viewBox="0 0 1200 720" fill="none" aria-hidden="true" focusable="false" preserveAspectRatio="xMaxYMid slice">
      <defs><linearGradient id="${id}" x1="200" y1="600" x2="1100" y2="120" gradientUnits="userSpaceOnUse"><stop stop-color="#2168ff" stop-opacity="0"/><stop offset=".4" stop-color="#397eff"/><stop offset=".76" stop-color="#cfff42"/><stop offset="1" stop-color="#cfff42" stop-opacity="0"/></linearGradient></defs>
      <g class="signal-stream" stroke="url(#${id})">
        <path class="signal-halo" d="M180 680C300 420 1160 650 1060 270S450 100 680-110"/>
        <path class="signal-track" d="M180 680C300 420 1160 650 1060 270S450 100 680-110"/>
        <path class="signal-packet" pathLength="100" d="M180 680C300 420 1160 650 1060 270S450 100 680-110"/>
        <path class="signal-secondary" d="M280 780C120 300 1070 550 1120 200S800 50 980-120"/>
      </g>
      <g class="signal-stars" fill="#b5d9ff"><circle cx="1050" cy="130" r="2"/><circle cx="790" cy="540" r="2.5"/><circle cx="610" cy="200" r="1.5"/><circle cx="1150" cy="430" r="1.5"/><circle cx="920" cy="620" r="2"/></g>
    </svg>
    <div class="signal-near">${fragments}</div>`;
}

function startScenes() {
  const main = document.querySelector("main");
  if (!main) return;
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const compact = matchMedia("(max-width: 760px)");
  const economical = navigator.connection?.saveData || navigator.deviceMemory <= 2 || navigator.hardwareConcurrency <= 2;
  const layers = [...main.children].filter(section => section.tagName === "SECTION").map((section, index) => {
    const layer = document.createElement("div");
    layer.className = `signal-scene scene-${index % 3}`;
    layer.setAttribute("aria-hidden", "true");
    layer.innerHTML = sceneMarkup(index, economical);
    section.classList.add("has-signal-scene");
    section.prepend(layer);
    return { section, layer };
  });
  const stageCards = [...main.querySelectorAll("[data-galaxy-card],.atlas-route,.solution-card,.portfolio-card,.process-step")];
  const worldStage = document.querySelector(".galaxy-stage");
  const worldSections = [main.querySelector(".atlas-directory"), main.querySelector(".library-closing")];
  let frame = 0;
  function update() {
    frame = 0;
    const still = reduced.matches || economical || root.classList.contains("cosmos-gated") || !root.classList.contains("motion-enabled");
    const animate = !still && !document.hidden;
    if (root.classList.contains("signal-motion") !== animate) root.classList.toggle("signal-motion", animate);
    const measurements = layers.map(({section,layer}) => ({section,layer,rect:section.getBoundingClientRect()}));
    const cardMeasurements = stageCards.map(card => ({card,rect:card.getBoundingClientRect()}));
    const worldTops = worldSections.map(section => section?.getBoundingClientRect().top);
    if (worldStage && worldTops.every(Number.isFinite)) {
      const explore = still ? 0 : worldTransition(worldTops[0], innerHeight);
      const contact = still ? 0 : worldTransition(worldTops[1], innerHeight);
      worldStage.style.setProperty("--world-explore", explore.toFixed(4));
      worldStage.style.setProperty("--world-contact", contact.toFixed(4));
      worldStage.style.setProperty("--world-drift", `${((explore-contact)*-55).toFixed(1)}px`);
      worldStage.style.setProperty("--world-zoom", (1.05 + explore*.12 + contact*.09).toFixed(4));
      worldStage.style.setProperty("--world-arrival-y", `${(-explore * 115).toFixed(1)}px`);
      worldStage.style.setProperty("--world-explore-x", `${((1-explore)*90-contact*70).toFixed(1)}px`);
      worldStage.style.setProperty("--world-contact-y", `${((1-contact)*100).toFixed(1)}px`);
      worldStage.style.setProperty("--world-sweep-turn", `${(-16 + explore*32 + contact*24).toFixed(1)}deg`);
      worldStage.style.setProperty("--world-sweep-opacity", (Math.sin(explore*Math.PI)*.48 + Math.sin(contact*Math.PI)*.48).toFixed(3));
    }
    for (const { section, layer, rect } of measurements) {
      if (rect.bottom < -100 || rect.top > innerHeight + 100) continue;
      const value = sceneFrame({ top: rect.top, height: rect.height, viewport: innerHeight, compact: compact.matches, reduced: still });
      layer.style.setProperty("--signal-near", `${value.near.toFixed(2)}px`);
      layer.style.setProperty("--signal-far", `${value.far.toFixed(2)}px`);
      layer.style.setProperty("--signal-turn", `${value.turn.toFixed(2)}deg`);
      layer.style.setProperty("--signal-scale", value.scale.toFixed(3));
      layer.style.setProperty("--signal-draw", value.draw.toFixed(2));
      section.style.setProperty("--signal-art", `${value.art.toFixed(2)}px`);
      section.style.setProperty("--art-scroll-y", `${((value.progress-.5)*(compact.matches?-100:-180)).toFixed(2)}px`);
      section.style.setProperty("--art-scroll-x", `${((value.progress-.5)*(compact.matches?28:80)).toFixed(2)}px`);
      section.style.setProperty("--art-scroll-scale", (1.03+value.progress*.12).toFixed(3));
    }
    for (const {card,rect} of cardMeasurements) {
      if (rect.bottom < -100 || rect.top > innerHeight+120) continue;
      const entering = still ? 0 : clamp((rect.top-innerHeight*.82)/(innerHeight*.22),0,1);
      const exiting = still ? 0 : clamp((innerHeight*.08-rect.bottom)/(innerHeight*.16),0,1);
      const amount = Math.max(entering,exiting);
      card.style.setProperty("--stage-shift", `${(amount*(compact.matches?24:54)).toFixed(1)}px`);
      card.style.setProperty("--stage-opacity", (1-amount*.16).toFixed(3));
    }
  }
  function request() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(update);
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.target.classList.toggle("signal-in-view", entry.isIntersecting));
    request();
  }, { rootMargin: "50px" });
  layers.forEach(({ section }) => observer.observe(section));
  const cards = [...document.querySelectorAll(".atlas-route,.solution-card,.portfolio-card,.process-step")];
  const cardObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.target.classList.toggle("signal-card-visible", entry.isIntersecting));
  }, { threshold: .16 });
  cards.forEach(card => cardObserver.observe(card));
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request, { passive: true });
  window.addEventListener("pageshow", request);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) root.classList.remove("signal-motion");
    else request();
  });
  reduced.addEventListener("change", request);
  compact.addEventListener("change", request);
  new MutationObserver(request).observe(root, { attributes: true, attributeFilter: ["class"] });
  request();
}

if (typeof document !== "undefined") startScenes();
