export function galaxyBackdrop() {
  return `<div class="galaxy-stage" aria-hidden="true"><canvas class="universe-canvas"></canvas><canvas class="universe-particles"></canvas><div class="universe-shade"></div><div class="universe-grain"></div></div>
  <div class="universe-entry" role="dialog" aria-modal="true" aria-label="EmberWeb opening film" hidden>
    <video class="arrival-film" data-src="/visuals/ember-arrival.mp4" data-mobile-src="/visuals/ember-arrival-mobile.mp4" muted playsinline preload="none" aria-hidden="true"></video>
    <div class="logo-assembly" aria-hidden="true"><img class="logo-shard shard-0" src="/brand/ember-mark.svg" alt="" width="128" height="128"><img class="logo-shard shard-1" src="/brand/ember-mark.svg" alt="" width="128" height="128"><img class="logo-shard shard-2" src="/brand/ember-mark.svg" alt="" width="128" height="128"><img class="logo-shard shard-3" src="/brand/ember-mark.svg" alt="" width="128" height="128"><img class="logo-shard shard-4" src="/brand/ember-mark.svg" alt="" width="128" height="128"><img class="logo-shard shard-5" src="/brand/ember-mark.svg" alt="" width="128" height="128"><img class="logo-shard shard-6" src="/brand/ember-mark.svg" alt="" width="128" height="128"><img class="logo-shard shard-7" src="/brand/ember-mark.svg" alt="" width="128" height="128"><img class="logo-shard shard-8" src="/brand/ember-mark.svg" alt="" width="128" height="128"><img class="logo-shard shard-9" src="/brand/ember-mark.svg" alt="" width="128" height="128"><img class="logo-shard shard-10" src="/brand/ember-mark.svg" alt="" width="128" height="128"><img class="logo-shard shard-11" src="/brand/ember-mark.svg" alt="" width="128" height="128"></div>
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
