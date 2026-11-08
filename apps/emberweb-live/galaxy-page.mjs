export function galaxyBackdrop() {
  return `<div class="galaxy-stage" aria-hidden="true"><canvas class="universe-canvas"></canvas><canvas class="universe-particles"></canvas><img class="universe-gas-giant" src="/visuals/genesis-planet-v2.webp" alt="" width="1600" height="1000" decoding="async" fetchpriority="low"><img class="universe-moon" src="/visuals/genesis-moon-v2.webp" alt="" width="1024" height="1024" decoding="async" fetchpriority="low"><div class="universe-shade"></div><div class="universe-grain"></div></div>
  <div class="universe-entry" role="dialog" aria-modal="true" aria-label="EmberWeb opening film" hidden>
    <video class="arrival-film" data-src="/visuals/ember-arrival.mp4" muted playsinline preload="none" aria-hidden="true"></video>
    <img class="arrival-mark" src="/brand/ember-mark.svg" alt="" width="78" height="78">
    <button class="universe-skip" type="button">Skip intro</button>
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
