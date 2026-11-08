// Fail open if the cinematic module cannot load. The website never depends on WebGL.
(() => {
  if (location.hash) return;
  try { if (sessionStorage.getItem("ember:visited-atlas")) return; } catch {}
  history.scrollRestoration="manual";
  document.documentElement.classList.add("cosmos-gated");
  const watchdog = setTimeout(() => {
    document.documentElement.classList.remove("cosmos-gated", "cosmos-opening");
    document.querySelectorAll("[data-cosmos-inert]").forEach(element => { element.inert = false; element.removeAttribute("data-cosmos-inert"); });
    const entry = document.querySelector(".universe-entry");
    if (entry) entry.hidden = true;
  }, 9000);
  document.addEventListener("ember:cosmos-ready", () => clearTimeout(watchdog), { once: true });
})();
