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
  const layers = sections.map(section => {
    const light = document.createElement("div");
    light.className = "section-stage-light";
    light.setAttribute("aria-hidden", "true");
    section.classList.add("has-stage-light");
    light.innerHTML = '<div class="stage-beam"></div><div class="stage-objects"><i class="stage-object stage-object-ring"></i><i class="stage-object stage-object-chip"></i><i class="stage-object stage-object-spark"></i></div>';
    section.prepend(light);
    return { section, light };
  });
  let frame = 0;
  function update() {
    frame = 0;
    const enabled = !reduced.matches && document.documentElement.classList.contains("motion-enabled");
    for (const { section, light } of layers) {
      const rect = section.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) continue;
      const progress = enabled ? Math.max(0, Math.min(1, (innerHeight - rect.top) / (innerHeight + rect.height))) : .5;
      // Two restrained depths; the reading surface never translates or rotates.
      light.style.setProperty("--stage-parallax", (enabled ? (progress - .5) * 140 : 0).toFixed(2) + "px");
      light.style.setProperty("--beam-parallax", (enabled ? (progress - .5) * 50 : 0).toFixed(2) + "px");
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
  const observer = new IntersectionObserver(entries => {
    for (const item of entries) item.target.classList.toggle("is-stage-active", item.isIntersecting);
    request();
  });
  sections.forEach(section => observer.observe(section));
  request();
})();
