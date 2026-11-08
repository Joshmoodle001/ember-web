export function galaxyBackdrop() {
  return `<div class="galaxy-stage" aria-hidden="true"><canvas class="universe-canvas"></canvas><canvas class="universe-particles"></canvas><img class="universe-gas-giant" src="/visuals/genesis-planet-v2.webp" alt="" width="1600" height="1000" decoding="async" fetchpriority="low"><img class="universe-moon" src="/visuals/genesis-moon-v2.webp" alt="" width="1024" height="1024" decoding="async" fetchpriority="low"><div class="universe-shade"></div><div class="universe-grain"></div></div>
  <div class="universe-entry" role="dialog" aria-modal="true" aria-label="Enter the Ember universe" hidden>
    <div class="entry-void" aria-hidden="true"></div>
    <div class="event-horizon-film" aria-hidden="true"><div class="event-disk"></div><div class="event-shock"></div><div class="event-planet"></div></div>    <button class="universe-ignite" type="button" aria-label="Ignite the Ember universe"><img src="/brand/ember-mark.svg" alt="" width="128" height="128"><span class="ignite-hint">One spark changes everything.</span></button>
    <p class="entry-caption" aria-live="polite"></p><button class="universe-skip" type="button">Skip intro <span aria-hidden="true">↗</span></button>
  </div>`;
}

export function markGalaxyCards(body) {
  const classes = new Set(["atlas-route", "project-visual", "client-path-card", "capability-card", "workflow-panel", "signal-step", "card", "possibility-card", "launch-step", "crew-role"]);
  return body.replace(/<(?:article|div|li|a)\b[^>]*\bclass="([^"]*)"[^>]*>/g, (tag, value) =>
    value.split(/\s+/).some(name => classes.has(name)) ? tag.slice(0, -1) + " data-galaxy-card>" : tag,
  ).replace(/(<div class="principle-grid">)([\s\S]*?)(<\/div>)/g, (_, open, articles, close) =>
    open + articles.replaceAll("<article>", "<article data-galaxy-card>") + close,
  );
}
