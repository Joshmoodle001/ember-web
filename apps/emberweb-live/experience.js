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
    light.innerHTML = '<div class="stage-beam"></div><div class="stage-grid"></div>';
    section.prepend(light);
    return { section, light, index };
  });
  let frame = 0;
  function update() {
    frame = 0;
    const enabled = !reduced.matches && document.documentElement.classList.contains("motion-enabled");
    for (const { section, light, index } of layers) {
      const rect = section.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) continue;
      const progress = enabled ? Math.max(0, Math.min(1, (innerHeight - rect.top) / (innerHeight + rect.height))) : .5;
      // A slow approach, a settled central reading interval, then departure.
      let travel = progress < .35 ? (progress / .35 - 1) : progress > .7 ? (progress - .7) / .3 : 0;
      travel = Math.sign(travel) * travel * travel;
      light.style.setProperty("--light-x", ((index % 2 ? -1 : 1) * travel * 85).toFixed(3) + "%");
      light.style.setProperty("--light-turn", ((index % 2 ? 1 : -1) * (12 + travel * 24)).toFixed(3) + "deg");
      light.style.setProperty("--light-hue", String(195 + index % 3 * 24));
    }
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
