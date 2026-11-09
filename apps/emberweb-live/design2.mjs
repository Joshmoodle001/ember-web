import { renderFooter } from "./footer.mjs";
import { galaxyBackdrop, markGalaxyCards } from "./galaxy-page.mjs";
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const links = [['/ai-lab','AI Lab'],['/work','Solutions'],['/portfolio','Portfolio'],['/packages','Pricing'],['/process','How we work'],['/login','Customer Login']];
const sectionLinks = {
  "/work": [["websites","Websites"],["apps","Apps"],["engines","AI tools"],["workflow-examples","Workflow examples"]],
  "/portfolio": [["portfolio-category-business-systems","Business systems"],["portfolio-category-web-platforms","Web platforms"],["portfolio-category-mobile-consumer","Mobile"],["portfolio-category-content-learning","Learning"]],
  "/studio": [["crew","Meet the crew"],["starting-point","Find your starting point"]],
  "/ai-lab": [["examples","Read the examples"]]
};
function directoryNav(path){
  if(path==="/"||path==="/404")return "";
  const local=(sectionLinks[path]||[]).map(([anchor,label])=>'<a href="#'+anchor+'">'+label+'</a>').join("");
  return '<nav class="atlas-return" aria-label="Directory and page sections"><a href="/#explore">← Home</a>'+local+'</nav>';
}

const pageArtwork = {
  "/": "hero-home",
  "/work": "hero-solutions",
  "/portfolio": "hero-portfolio",
  "/packages": "hero-pricing",
  "/process": "hero-process",
  "/industries": "hero-industries",
  "/care": "hero-care",
  "/start": "hero-start",
  "/audit": "hero-audit",
  "/book": "hero-book",
  "/policies": "hero-policies",
  "/ai-lab": "hero-ai-lab",
  "/studio": "hero-studio"
};
export function renderDocument(page, body) {
  const illustration = pageArtwork[page.path];
  if (illustration) {
    const markup = `<picture class="page-artwork" aria-hidden="true">
      <source srcset="/visuals/library/${illustration}-768.webp 768w, /visuals/library/${illustration}.webp 1536w" sizes="(max-width:760px) 100vw, (min-width:1642px) 1280px, 83vw">
      <img src="/visuals/library/${illustration}.webp" alt="" width="1536" height="1024" fetchpriority="${page.path === "/" ? "high" : "auto"}">
    </picture>`;
    body = body.replace(/<section\b([^>]*)>/, (_, attributes) => `<section${attributes} data-page-art>${markup}`);
  }
  const galaxy = page.path === "/";
  if (galaxy) body = markGalaxyCards(body);
  const galaxyHead = galaxy ? '<link rel="stylesheet" href="/galaxy.css?v=native-playback"><script src="/galaxy-boot.js?v=return-journey-2"></script>' : "";
  const galaxyScript = galaxy ? '<script type="module" src="/galaxy.mjs?v=return-journey-2"></script>' : "";
  const nav = links.map(([href,label]) => `<a href="${href}"${href === "/login" ? ' class="site-sign-in"' : ""}${page.path === href ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  const mobile = [...links,['/book','Book a call'],['/audit','Free audit'],['/care','Ongoing care'],['/industries','Industries']].map(([href,label]) => `<a href="${href}" tabindex="-1"${page.path === href ? ' aria-current="page"' : ''}>${label}<span aria-hidden="true">↗</span></a>`).join('');
  return `<!doctype html><html lang="en-ZA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(page.title)}</title><link rel="stylesheet" href="/design2.css?v=20261024-client-paths"><link rel="stylesheet" href="/motion.css?v=20261024-client-paths"><link rel="stylesheet" href="/kinetic.css?v=20261024-client-paths"><link rel="stylesheet" href="/client-paths.css?v=20261024-client-paths"><link rel="stylesheet" href="/palette.css?v=20261028-cobalt-lime"><link rel="stylesheet" href="/studio.css?v=20261028-studio"><link rel="icon" type="image/svg+xml" href="/brand/ember-mark.svg"><link rel="stylesheet" href="/portfolio.css?v=20261028-portfolio"><link rel="stylesheet" href="/intro-film.css?v=20261028-film"><link rel="stylesheet" href="/orbit.css?v=20261028"><link rel="stylesheet" href="/editorial.css?v=20261107-reference"><link rel="stylesheet" href="/ember-world.css?v=native-playback">${galaxyHead}<link rel="stylesheet" href="/studio-pages.css?v=native-playback"><link rel="stylesheet" href="/ai-mobile.css?v=native-playback"><link rel="stylesheet" href="/crafted-studio.css?v=art-library-1"><link rel="stylesheet" href="/art-library.css?v=library-1"><link rel="stylesheet" href="/studio-refine.css?v=studio-refine-2"></head><body data-motion-scope="background" data-intro="off" data-page="${escape(page.path)}"><div class="crafted-backdrop" aria-hidden="true"></div>${galaxy ? galaxyBackdrop() : ""}<a class="skip-link" href="#main-content">Skip to content</a><div class="progress" aria-hidden="true"></div><header class="site-header"><nav class="site-nav" aria-label="Main navigation"><a class="brand" href="/" aria-label="EmberWeb home"><img src="/brand/ember-mark.svg" alt="" width="38" height="38"><span>EMBERWEB</span></a><div class="site-nav-links">${nav}</div><a class="site-nav-cta" href="/start">Start a project <span aria-hidden="true">↗</span></a><button class="menu-toggle" type="button" hidden aria-label="Open navigation" aria-expanded="false" aria-controls="mobile-navigation"><span class="sr-only">Open navigation</span><i></i><i></i></button></nav><div class="mobile-nav" id="mobile-navigation" aria-hidden="true">${mobile}<a class="mobile-nav-cta" href="/start" tabindex="-1">Start a project <span aria-hidden="true">↗</span></a></div></header><noscript><nav class="fallback-nav" aria-label="Site navigation">${links.map(([href,label]) => `<a href="${href}">${label}</a>`).join('')}<a href="/book">Book a call</a><a href="/audit">Free audit</a><a href="/care">Ongoing care</a><a href="/industries">Industries</a></nav></noscript>${directoryNav(page.path)}<main id="main-content"${galaxy ? ' class="cosmos-home" tabindex="-1"' : ""}>${body}</main>${renderFooter()}<script src="/journeys.js?v=native-playback" defer></script><script src="/site.js?v=native-playback" defer></script><script src="/motion.js?v=native-playback" defer></script><script src="/experience.js?v=studio-refine-2" defer></script><script src="/mission-control.js?v=native-playback" defer></script>${galaxyScript}</body></html>`;
}

export const art = {
  heroOrbits: `<svg class="hero-orbits" viewBox="0 0 1000 1000" aria-hidden="true" focusable="false"><g fill="none" stroke="#66d4f3" stroke-width="1.5"><circle cx="500" cy="500" r="435" opacity=".45"/><ellipse cx="500" cy="500" rx="460" ry="215" transform="rotate(-32 500 500)" opacity=".65"/><ellipse cx="500" cy="500" rx="260" ry="470" transform="rotate(28 500 500)" opacity=".4"/></g><g class="orbit-slow" fill="none" stroke="#cff752" stroke-width="3"><circle cx="500" cy="500" r="435" pathLength="1" stroke-dasharray=".16 .84"/><circle cx="935" cy="500" r="7" fill="#cff752" stroke="none"/></g><g class="orbit-counter" fill="none" stroke="#ff9060" stroke-width="2"><circle cx="500" cy="500" r="375" pathLength="1" stroke-dasharray=".08 .42 .08 .42"/></g></svg>`,
  sigils: ['<path d="M16 32 32 16 48 32 32 48Z M24 24l16 16m0-16L24 40"/>','<circle cx="32" cy="32" r="8"/><ellipse cx="32" cy="32" rx="26" ry="12" transform="rotate(-32 32 32)"/>','<path d="M12 44 32 24 52 44M12 32 32 12 52 32M20 52h24"/>'].map(path => `<svg class="journey-sigil" viewBox="0 0 64 64" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5">${path}</svg>`),
};
