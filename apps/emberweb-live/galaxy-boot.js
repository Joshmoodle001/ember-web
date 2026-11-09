// Fail open if the cinematic module cannot load. The website never depends on WebGL.
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // Direct arrivals and reloads get the opening; browsing the site stays immediate.
  const navigation = performance.getEntriesByType("navigation")[0];
  let internalArrival = false;
  try {
    internalArrival = Boolean(document.referrer) && new URL(document.referrer).origin === location.origin;
  } catch { /* An unavailable referrer behaves like a direct arrival. */ }
  if (navigation?.type === "back_forward" || (navigation?.type !== "reload" && internalArrival)) return;

  document.documentElement.classList.add("cosmos-gated");
  const watchdog = setTimeout(() => {
    document.documentElement.classList.remove("cosmos-gated", "cosmos-opening");
    document.querySelectorAll("[data-cosmos-inert]").forEach(element => { element.inert = false; element.removeAttribute("data-cosmos-inert"); });
    const entry = document.querySelector(".universe-entry");
    if (entry) entry.hidden = true;
  }, 9000);
  document.addEventListener("ember:cosmos-ready", () => clearTimeout(watchdog), { once: true });
})();
