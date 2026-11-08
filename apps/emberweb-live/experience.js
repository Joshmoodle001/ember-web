"use strict";

(() => {
  // Every project remains readable when scripting is unavailable.
  document.querySelectorAll("[data-project-explorer]").forEach(explorer => {
    const picker = explorer.querySelector(".project-picker");
    const buttons = [...explorer.querySelectorAll("[data-project-target]")];
    const panels = [...explorer.querySelectorAll(".project-panel")];
    if (!picker || buttons.length !== panels.length || buttons.some(button => !panels.some(panel => panel.id === button.dataset.projectTarget))) return;
    function select(button) {
      buttons.forEach(control => control.setAttribute("aria-pressed", String(control === button)));
      panels.forEach(panel => { panel.hidden = panel.id !== button.dataset.projectTarget; });
    }
    buttons.forEach(button => button.addEventListener("click", () => select(button)));
    select(buttons[0]);
    picker.hidden = false;
  });

})();

/* Scroll choreography belongs to the decorative layer behind each section. */
(() => {
  const main = document.querySelector("main");
  if (!main) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const sections = [...main.children].filter(element => element.tagName === "SECTION");
  const layers = sections.map((section, index) => {
    const light = document.createElement("div");
    light.className = "section-stage-light";
    light.setAttribute("aria-hidden", "true");
    section.classList.add("has-stage-light");
    light.style.setProperty("--light-hue", String(195 + index % 3 * 24));
    light.innerHTML = '<div class="stage-beam"></div><div class="stage-grid"></div>';
    section.prepend(light);
    return { section, light, index };
  });
  let frame = 0;
  function update() {
    frame = 0;
    const enabled = !reduced.matches && document.documentElement.classList.contains("motion-enabled");
    let current = 0;
    let closest = Infinity;
    for (const { section, light, index } of layers) {
      const rect = section.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) continue;
      const distance = Math.abs(rect.top + Math.min(rect.height / 2, innerHeight / 2) - innerHeight / 2);
      if (distance < closest) { closest = distance; current = index + Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height))); }
      const progress = enabled ? Math.max(0, Math.min(1, (innerHeight - rect.top) / (innerHeight + rect.height))) : .5;
      // A slow approach, a settled central reading interval, then departure.
      let travel = progress < .35 ? (progress / .35 - 1) : progress > .7 ? (progress - .7) / .3 : 0;
      travel = Math.sign(travel) * travel * travel;
      light.style.setProperty("--light-x", ((index % 2 ? -1 : 1) * travel * 85).toFixed(3) + "%");
      light.style.setProperty("--light-turn", ((index % 2 ? 1 : -1) * (12 + travel * 24)).toFixed(3) + "deg");
    }
    const root = document.documentElement;
    const camera = enabled ? current : 0;
    root.style.setProperty("--backdrop-x", (Math.sin(camera * 1.8) * 7).toFixed(3) + "%");
    root.style.setProperty("--backdrop-y", (-Math.cos(camera * 1.1) * 3).toFixed(3) + "%");
    root.style.setProperty("--backdrop-scale", (1.12 + Math.sin(camera * .9) * .08).toFixed(4));
    root.style.setProperty("--backdrop-accent", String(195 + Math.round(camera) % 3 * 20));
  }
  function request() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(update);
  }
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request, { passive: true });
  document.addEventListener("visibilitychange", request);
  reduced.addEventListener("change", request);
  new MutationObserver(request).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  request();
})();

(() => {
  const movie = document.querySelector(".crafted-background-film");
  if (!movie) return;
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const limited = navigator.connection?.saveData || (navigator.deviceMemory && navigator.deviceMemory <= 2);
  let rejected = false;
  function sync() {
    const active = !limited && !reduced.matches && !document.hidden && !root.classList.contains("cosmos-gated");
    if (!active || rejected) { movie.pause(); return; }
    if (!movie.getAttribute("src")) movie.src = movie.dataset.src;
    movie.muted = true;
    if (movie.paused) movie.play().catch(() => { rejected = true; });
  }
  new MutationObserver(sync).observe(root, {attributes:true,attributeFilter:["class"]});
  document.addEventListener("visibilitychange", sync);
  window.addEventListener("pagehide", () => movie.pause());
  window.addEventListener("pageshow", sync);
  reduced.addEventListener("change", sync);
  movie.addEventListener("error", () => { rejected = true; movie.hidden = true; });
  sync();
})();
