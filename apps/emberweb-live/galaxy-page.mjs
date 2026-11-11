export function galaxyBackdrop() {
  return `<div class="galaxy-stage" aria-hidden="true"><div class="cinema-world cinema-world-arrival"></div><div class="cinema-world cinema-world-explore"></div><div class="cinema-world cinema-world-contact"></div><div class="cinema-world-veil"></div><div class="universe-shade"></div><div class="universe-grain"></div></div>
  <div class="universe-entry" role="dialog" aria-modal="true" aria-label="EmberWeb opening film" hidden>
    <video class="arrival-film" data-src="/visuals/ember-arrival-playback.mp4" data-mobile-src="/visuals/ember-arrival-playback-mobile.mp4" data-economy-src="/visuals/ember-arrival-playback-lite.mp4" data-economy-desktop-src="/visuals/ember-arrival-playback-lite-desktop.mp4" muted autoplay playsinline webkit-playsinline preload="auto" aria-hidden="true"></video>
    <button class="universe-play" type="button" hidden>Play opening film</button>
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
