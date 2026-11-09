
const stage = document.querySelector(".galaxy-stage");
const entry = document.querySelector(".universe-entry");
const film = entry.querySelector("video");
const skip = entry.querySelector(".universe-skip");
const replay = document.querySelector(".universe-replay");
const root = document.documentElement;
const main = document.querySelector("main");
const heading = main.querySelector("h1");
const compact = matchMedia("(max-width: 760px)");
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const moving = () => !reduced.matches && root.classList.contains("motion-enabled");

const arrivalAnchor = window.location?.hash;
let session = 0;
let returnFocus;
let deadline;
function finishIntro() {
  if (entry.hidden) return;
  session++;
  clearTimeout(deadline);
  entry.hidden = true;
  film.pause();
  root.classList.remove("cosmos-gated", "cosmos-opening");
  for (const element of document.querySelectorAll("[data-cosmos-inert]")) {
    element.inert = false;
    delete element.dataset.cosmosInert;
  }

  heading.tabIndex = -1;
  (returnFocus || heading).focus({ preventScroll: true });
  if (!returnFocus && arrivalAnchor) {
    document.getElementById(arrivalAnchor.slice(1))?.scrollIntoView({ behavior: "instant", block: "start" });
  }

}

function playIntro() {
  if (!moving()) {
    root.classList.remove("cosmos-gated");
    return;
  }
  const generation = ++session;
  returnFocus = document.activeElement === replay ? replay : null;
  for (const element of document.body.children) {
    if (element === entry || element === stage || element.inert || element.tagName === "SCRIPT") continue;
    element.inert = true;
    element.dataset.cosmosInert = "";
  }
  window.scrollTo({ top: 0, behavior: "instant" });
  entry.classList.remove("film-playing");
  entry.hidden = false;
  root.classList.add("cosmos-gated", "cosmos-opening");
  skip.focus({ preventScroll: true });
  if (!film.getAttribute("src")) {
    const lowPower = navigator.connection?.saveData || (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
    film.src = compact.matches ? (lowPower ? film.dataset.economySrc : film.dataset.mobileSrc) : (lowPower ? film.dataset.economyDesktopSrc : film.dataset.src);
  }
  film.muted = true;
  film.currentTime = 0;
  // A stalled stream must never leave the visitor behind the opening.
  if (!document.hidden) {
    deadline = setTimeout(finishIntro, 12000);
    film.play().catch(() => { if (session === generation && !document.hidden) finishIntro(); });
  }
}

entry.addEventListener("click", finishIntro);
entry.addEventListener("wheel", finishIntro, { passive: true });
entry.addEventListener("touchmove", finishIntro, { passive: true });
film.addEventListener("playing", () => entry.classList.add("film-playing"));
film.addEventListener("ended", finishIntro);
film.addEventListener("error", finishIntro);
film.addEventListener("timeupdate", () => {
  if (Number.isFinite(film.duration)) root.style.setProperty("--film-arrival", Math.min(1, Math.max(0, 1 - (film.duration - film.currentTime) / .55)));
});
replay.addEventListener("click", () => {
  root.style.setProperty("--film-arrival", "0");
  playIntro();
});
document.addEventListener("keydown", event => {
  if (entry.hidden) return;
  if (event.key === "Tab") { event.preventDefault(); skip.focus(); return; }
  if (["Escape","Enter"," ","ArrowDown","PageDown"].includes(event.key)) { event.preventDefault(); finishIntro(); }
});
document.addEventListener("visibilitychange", () => {
  if (entry.hidden) return;
  if (document.hidden) {
    film.pause();
    entry.classList.remove("film-playing");
    clearTimeout(deadline);
  } else {
    deadline = setTimeout(finishIntro, 12000);
    film.play().catch(() => { if (!document.hidden) finishIntro(); });
  }
});
function updateMotion() {
  if (!moving()) finishIntro();

}
new MutationObserver(updateMotion).observe(root, { attributes: true, attributeFilter: ["class"] });
reduced.addEventListener("change", updateMotion);

window.addEventListener("pagehide", () => { film.pause(); clearTimeout(deadline); });
window.addEventListener("pageshow", event => {
  if (event.persisted) {
    // A restored page is a return within the journey, not a new arrival.
    finishIntro();
  }
});

if (root.classList.contains("cosmos-gated")) playIntro();
document.dispatchEvent(new Event("ember:cosmos-ready"));
