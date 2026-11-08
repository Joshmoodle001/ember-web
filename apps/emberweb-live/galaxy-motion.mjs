export const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
export const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

// One visible-time timeline owns the film, CSS suction and rendered world.
export const INTRO_DURATION = 6200;
export function genesisAt(milliseconds) {
  const t = Math.max(0, milliseconds) / 1000;
  return {
    collapse: smooth((t - .25) / 1.85),
    tunnel: smooth((t - 1.9) / .85) * (1 - smooth((t - 3.05) / .65)),
    explosion: smooth((t - 2.8) / .7),
    expansion: smooth((t - 3.1) / 2.3),
    reveal: smooth((t - 4.8) / 1.4),
    caption: t < 1.9 ? "Approaching the event horizon." : t < 3.1 ? "Crossing the horizon." : "Arrival · Planet Ember.",
    complete: milliseconds >= INTRO_DURATION,
  };
}

// Real section geometry determines camera chapters. A long pinned formation
// scene gets a full 1→2 chapter, instead of being rushed by page-fraction math.
export function chapterAt(scrollY, viewport, chapters) {
  if (!chapters.length) return 0;
  const marker = scrollY + viewport * .25;
  let index = 0;
  while (index + 1 < chapters.length && marker >= chapters[index + 1].top) index += 1;
  const current = chapters[index];
  const next = chapters[index + 1];
  if (!next) return current.scene;
  const fraction = smooth((marker - current.top) / Math.max(1, next.top - current.top));
  return current.scene + (next.scene - current.scene) * fraction;
}

export function celestialPose(scene) {
  const stops=[
    {scene:0,planetX:135,planetY:80,planetScale:.35,planetOpacity:0,moonX:125,moonY:90,moonScale:.2,moonOpacity:0},
    {scene:1.7,planetX:135,planetY:80,planetScale:.45,planetOpacity:0,moonX:95,moonY:85,moonScale:.3,moonOpacity:.75},
    {scene:2.45,planetX:112,planetY:90,planetScale:.6,planetOpacity:.65,moonX:3,moonY:90,moonScale:1,moonOpacity:.75},
    {scene:3.15,planetX:75,planetY:80,planetScale:1.25,planetOpacity:.85,moonX:-80,moonY:40,moonScale:2,moonOpacity:0},
    {scene:3.65,planetX:-50,planetY:25,planetScale:2.6,planetOpacity:.65,moonX:-80,moonY:40,moonScale:2,moonOpacity:0},
    {scene:4.1,planetX:-200,planetY:-40,planetScale:3,planetOpacity:0,moonX:112,moonY:70,moonScale:.3,moonOpacity:.3},
    {scene:4.8,planetX:90,planetY:80,planetScale:.35,planetOpacity:.4,moonX:115,moonY:85,moonScale:.2,moonOpacity:.15},
  ];
  let index=0;while(index<stops.length-2&&scene>stops[index+1].scene)index++;
  const a=stops[index],b=stops[index+1],fraction=smooth((scene-a.scene)/(b.scene-a.scene));
  return Object.fromEntries(Object.keys(a).filter(key=>key!=="scene").map(key=>[key,a[key]+(b[key]-a[key])*fraction]));
}

// Geometry is the original layout box, never a transformed client rectangle.
// Entry completes before the reading zone; exit starts below the sticky header.
export function cardFlight(top, height, viewport, index = 0, compact = false) {
  const entry = 1 - smooth((viewport * .98 - top) / Math.max(1, Math.min(viewport * .26, height * .9)));
  const exit = smooth((viewport * .10 - top - height) / Math.max(1, Math.min(viewport * .22, height * .7)));
  const lane = index % 2 ? 1 : -1;
  const depth = .84 + (index % 3) * .08;
  return {
    x: lane * ((compact ? 68 : 340) * entry - (compact ? 34 : 155) * exit) * depth,
    y: ((compact ? -24 : -65) * entry - (compact ? 42 : 105) * exit) * depth,
    z: compact ? 0 : -520 * entry + 160 * exit,
    yaw: compact ? 0 : lane * (23 * entry - 12 * exit),
    pitch: compact ? 0 : -9 * entry + 5 * exit,
    roll: lane * ((compact ? 3 : 5) * entry - 3 * exit),
    scale: 1 - .19 * entry + .045 * exit,
    opacity: 1 - .65 * entry - .56 * exit,
    blur: compact ? 0 : 1.8 * entry + .8 * exit,
  };
}
