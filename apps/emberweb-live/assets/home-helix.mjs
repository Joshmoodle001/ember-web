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
    const radius = width * (compact.matches ? .33 : .36);
    const wavelength = height * .43;
    const segments = 96;
    const paths = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    for (let strand = 0; strand < 2; strand++) {
      let previousX;
      let previousY;
      for (let segment = 0; segment <= segments; segment++) {
        const y = segment * height / segments;
        const angle = y / wavelength * turn + phase + strand * Math.PI;
        const x = center + Math.sin(angle) * radius;
        if (segment) {
          const depth = Math.cos(angle) > 0 ? 1 : 0;
          const path = paths[strand * 2 + depth];
          path.moveTo(previousX, previousY);
          path.lineTo(x, y);
        }
        previousX = x;
        previousY = y;
      }
    }
    const colours = ["#225ad7", "#86b4ff", "#638031", "#d4ff5a"];
    context.lineCap = "round";
    for (const index of [0, 2, 1, 3]) {
      const foreground = index % 2 === 1;
      context.strokeStyle = colours[index];
      context.globalAlpha = foreground ? .13 : .09;
      context.lineWidth = foreground ? 7 : 4;
      context.stroke(paths[index]);
      context.globalAlpha = foreground ? .73 : .29;
      context.lineWidth = foreground ? 1.65 : 1;
      context.stroke(paths[index]);
    }
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
    stage.style.setProperty("--helix-strength", (still ? .28 : (.38 + arrival * .5) * exit * (compact.matches ? .68 : 1)).toFixed(3));
    for (const [chapter, rect] of views) {
      const enter = clamp((viewport - rect.top) / (viewport * .58), 0, 1);
      const leave = clamp(rect.bottom / (viewport * .48), 0, 1);
      const focus = still ? 1 : smooth(Math.min(enter, leave));
      chapter.style.setProperty("--chapter-art-opacity", (.10 + focus * .68).toFixed(3));
      chapter.style.setProperty("--chapter-copy-opacity", (.86 + focus * .14).toFixed(3));
      chapter.style.setProperty("--chapter-shift", `${((1 - focus) * (enter < leave ? 12 : -12)).toFixed(1)}px`);
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
