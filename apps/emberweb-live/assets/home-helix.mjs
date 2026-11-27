const stage = document.querySelector(".home-helix-stage");
const canvas = stage?.querySelector("canvas");
const context = canvas?.getContext("2d");

if (stage && canvas && context) {
  const chapters = [...stage.parentElement.querySelectorAll(".home-chapter")];
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const compact = matchMedia("(max-width: 760px)");
  const turn = Math.PI * 2;
  let frame = 0;
  let width = 0;
  let height = 0;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const smooth = value => value * value * (3 - 2 * value);

  function drawHelix(phase) {
    context.clearRect(0, 0, width, height);
    const center = width / 2;
    const compactView = compact.matches;
    const radius = width * (compactView ? .32 : .36);
    const segments = 100;
    const depthBands = 7;
    const ribbons = ["#5b92ff", "#d4ff59"].map((color, index) => {
      const points = Array.from({ length: segments + 1 }, (_, segment) => {
        const along = segment / segments;
        const angle = Math.log1p(along * 3) * 1.82 * turn + phase + index * Math.PI;
        const depth = .5 + Math.cos(angle) * .5;
        const perspective = (.32 + along * .7) * (.73 + depth * .42);
        return { x: center + Math.sin(angle) * radius * perspective, y: along * height, depth, perspective };
      });
      const bands = Array.from({ length: depthBands }, () => ({
        hull: new Path2D(), edge: new Path2D(), glow: new Path2D(),
      }));
      const sides = points.map((point, segment) => {
        const previous = points[Math.max(0, segment - 1)];
        const next = points[Math.min(segments, segment + 1)];
        const dx = next.x - previous.x;
        const dy = next.y - previous.y;
        const thickness = (compactView ? 6 : 12) * point.perspective / Math.hypot(dx, dy);
        return { x: dy * thickness, y: -dx * thickness };
      });
      for (let segment = 1; segment <= segments; segment++) {
        const a = points[segment - 1];
        const b = points[segment];
        const depth = Math.min(depthBands - 1, Math.floor((a.depth + b.depth) * depthBands / 2));
        const { hull, edge, glow } = bands[depth];
        const left = sides[segment - 1];
        const right = sides[segment];
        hull.moveTo(a.x - left.x, a.y - left.y);
        hull.lineTo(b.x - right.x, b.y - right.y);
        hull.lineTo(b.x + right.x, b.y + right.y);
        hull.lineTo(a.x + left.x, a.y + left.y);
        hull.closePath();
        edge.moveTo(a.x + left.x, a.y + left.y);
        edge.lineTo(b.x + right.x, b.y + right.y);
        glow.moveTo(a.x, a.y);
        glow.lineTo(b.x, b.y);
      }
      return { color, bands };
    });
    context.save();
    context.lineCap = "round";
    for (let index = 0; index < depthBands; index++) {
      const depth = index / (depthBands - 1);
      for (const { color, bands } of ribbons) {
        const { hull, edge, glow } = bands[index];
        context.strokeStyle = color;
        context.globalAlpha = .025 + depth * .07;
        context.lineWidth = compactView ? 13 : 25;
        context.stroke(glow);
        context.fillStyle = color;
        context.globalAlpha = .10 + depth * .29;
        context.fill(hull);
        context.globalAlpha = .20 + depth * .55;
        context.lineWidth = compactView ? 1 : 1.8;
        context.stroke(edge);
      }
    }
    context.restore();
  }

  function update() {
    frame = 0;
    if (!width || !height || document.hidden) return;
    const still = motion.matches || navigator.connection?.saveData;
    const position = window.scrollY;
    const viewport = window.innerHeight;
    const views = chapters.map(chapter => [chapter, chapter.getBoundingClientRect()]);
    drawHelix(still ? 0 : position / (compact.matches ? 1100 : 900) * turn);
    const arrival = smooth(clamp(position / (viewport * .82), 0, 1));
    const end = views.at(-1)[1].bottom;
    const exit = smooth(clamp(end / (viewport * .85), 0, 1));
    const drift = still ? 0 : clamp(position / viewport, 0, 1);
    stage.parentElement.style.setProperty("--hero-drift", `${(drift * 42).toFixed(1)}px`);
    stage.parentElement.style.setProperty("--hero-scale", (1 + drift * .09).toFixed(3));
    stage.style.setProperty("--helix-strength", (still ? .21 : (.18 + arrival * .77) * exit * (compact.matches ? .67 : 1)).toFixed(3));
    for (const [chapter, rect] of views) {
      const enter = clamp((viewport - rect.top) / (viewport * .58), 0, 1);
      const leave = clamp(rect.bottom / (viewport * .48), 0, 1);
      const focus = still ? 1 : smooth(Math.min(enter, leave));
      const travel = still ? 0 : clamp((viewport / 2 - rect.top - rect.height / 2) / viewport, -1, 1);
      chapter.style.setProperty("--chapter-art-opacity", (.10 + focus * .84).toFixed(3));
      chapter.style.setProperty("--chapter-drift", `${(travel * (compact.matches ? 34 : 55)).toFixed(1)}px`);
      chapter.style.setProperty("--chapter-scale", (still ? 1 : 1.08 + Math.abs(travel) * .10).toFixed(3));
      chapter.style.setProperty("--chapter-copy-opacity", (.90 + focus * .10).toFixed(3));
      chapter.style.setProperty("--chapter-shift", `${(travel * -12).toFixed(1)}px`);
    }
  }

  function requestFrame() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(update);
  }

  function resize() {
    const scale = Math.min(window.devicePixelRatio || 1, 1.5);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    requestFrame();
  }

  new ResizeObserver(resize).observe(canvas);
  window.addEventListener("scroll", () => {
    if (!motion.matches && !navigator.connection?.saveData) requestFrame();
  }, { passive: true });
  window.addEventListener("pageshow", requestFrame);
  document.addEventListener("visibilitychange", requestFrame);
  motion.addEventListener("change", requestFrame);
}
