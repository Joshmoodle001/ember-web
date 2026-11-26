
const entry = document.querySelector(".universe-entry");
const film = entry.querySelector("video");
const skip = entry.querySelector(".universe-skip");
const playButton = entry.querySelector(".universe-play");
const replay = document.querySelector(".universe-replay");
const root = document.documentElement;
const main = document.querySelector("main");
const heading = main.querySelector("h1");
const compact = matchMedia("(max-width: 760px)");
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const moving = () => !reduced.matches;

const arrivalAnchor = window.location?.hash;
let session = 0;
let returnFocus;
let deadline;
const startupTimeout = 3500;
const playbackTimeout = 12000;

function setDeadline(timeout) {
  clearTimeout(deadline);
  deadline = setTimeout(finishIntro, timeout);
}

function finishIntro() {
  if (entry.hidden) return;
  session++;
  clearTimeout(deadline);
  entry.hidden = true;
  film.pause();
  playButton.hidden = true;
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

function resumeFilm() {
  const generation = session;
  setDeadline(startupTimeout);
  film.play().then(() => {
    if (session === generation) playButton.hidden = true;
  }).catch(() => {
    if (session === generation && !document.hidden) playButton.hidden = false;
  });
}

function playIntro() {
  if (!moving()) {
    root.classList.remove("cosmos-gated");
    return;
  }
  session++;
  returnFocus = replay;
  for (const element of document.body.children) {
    if (element === entry || element.inert || element.tagName === "SCRIPT") continue;
    element.inert = true;
    element.dataset.cosmosInert = "";
  }
  window.scrollTo({ top: 0, behavior: "instant" });
  root.classList.remove("cosmos-landed");
  entry.classList.remove("film-playing");
  entry.hidden = false;
  root.classList.add("cosmos-gated", "cosmos-opening");
  skip.focus({ preventScroll: true });
  if (!film.getAttribute("src")) {
    const lowPower = navigator.connection?.saveData || (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
    film.src = compact.matches ? (lowPower ? film.dataset.economySrc : film.dataset.mobileSrc) : (lowPower ? film.dataset.economyDesktopSrc : film.dataset.src);
  }
  film.muted = true;
  film.defaultMuted = true;
  film.currentTime = 0;
  if (!document.hidden) resumeFilm();
}

skip.addEventListener("click", finishIntro);
playButton.addEventListener("click", resumeFilm);
film.addEventListener("playing", () => {
  if (entry.hidden || document.hidden) return;
  entry.classList.add("film-playing");
  setDeadline(playbackTimeout);
});
film.addEventListener("waiting", () => {
  if (!entry.hidden && !document.hidden) setDeadline(startupTimeout);
});
film.addEventListener("ended", () => {
  if (entry.hidden) return;
  finishIntro();
  if ((!arrivalAnchor || returnFocus) && moving()) root.classList.add("cosmos-landed");
});
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
  if (event.key === "Tab") {
    event.preventDefault();
    (playButton.hidden || document.activeElement === playButton ? skip : playButton).focus();
  }
  if (event.key === "Escape") { event.preventDefault(); finishIntro(); }
});
document.addEventListener("visibilitychange", () => {
  if (entry.hidden) return;
  if (document.hidden) {
    film.pause();
    entry.classList.remove("film-playing");
    clearTimeout(deadline);
  } else {
    resumeFilm();
  }
});
function updateMotion() {
  replay.hidden = !moving();
  if (!moving()) finishIntro();

}
reduced.addEventListener("change", updateMotion);

window.addEventListener("pagehide", () => { film.pause(); clearTimeout(deadline); });
window.addEventListener("pageshow", event => {
  if (event.persisted) {
    // A restored page is a return within the journey, not a new arrival.
    finishIntro();
  }
});

updateMotion();
