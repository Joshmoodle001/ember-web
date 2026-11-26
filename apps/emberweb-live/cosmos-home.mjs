import { PORTFOLIO_PROJECTS } from "./project-inventory.mjs";

const worlds = [
  ["/work", "Solutions", "Find a website, app or workflow that fits the way you work.", "ember-building-v2.webp", "01"],
  ["/ai-lab", "AI Lab", "Try six examples for business planning, admin and everyday life.", "ember-building-v2.webp", "02"],
  ["/portfolio", "Portfolio", "See the applications we’ve built and what each one does.", "ember-planning-v2.webp", "03"],
  ["/studio", "Our studio", "Meet your crew. See how we take an idea from a sketch to launch.", "ember-welcome-v2.webp", "04"],
];

export function cosmosHome() {
  return `<main id="main-content" class="page page-home"><section class="atlas-arrival" id="top" data-cosmos-scene="0" aria-labelledby="arrival-title"><div class="container atlas-arrival-inner">
  <div class="crafted-hero-art" aria-hidden="true"></div>
  <div class="atlas-copy"><div class="home-welcome"><span class="home-welcome-mark" aria-hidden="true"><img src="/brand/ember-mark.svg" alt="" width="48" height="48"><i></i><i></i><i></i><i></i><i></i></span><span class="home-welcome-text">Welcome.</span></div><p class="crafted-services">AI development · Apps · Websites</p><h1 id="arrival-title">Build what’s next.<br><em>With AI.</em></h1>
  <p>We design websites, build custom web apps and automate everyday work for South African businesses.</p>
  <div class="hero-actions"><a class="button button-primary" href="/start">Start a project <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 13 13 3M5 3h8v8"/></svg></a></div></div>
  <div class="atlas-edge"><a class="atlas-scroll-cue" href="#explore">Find your next step <span aria-hidden="true">↓</span></a><button type="button" class="universe-replay" hidden>Play opening</button></div></div></section>
  <section class="section section-light home-project-proof" aria-labelledby="home-proof"><div class="container"><h2 id="home-proof">See what we’ve built.</h2><div class="process-steps">${["automotive-workshop", "wholesale-hub", "me-body"].map(id => PORTFOLIO_PROJECTS.find(project => project.id === id)).map(project => `<article class="card"><h3>${project.name}</h3><p>${project.summary}</p><a class="text-link" href="/portfolio#portfolio-${project.id}">Project details<span aria-hidden="true"> →</span></a></article>`).join("")}</div></div></section>
  <section class="atlas-directory" id="explore" data-cosmos-scene="3.2" aria-labelledby="atlas-title"><div class="container"><h2 id="atlas-title">A better way<br><em>to work.</em></h2>
  <nav class="atlas-routes" aria-label="Choose a destination">${worlds.map(([href,title,description,image,number])=>`<a class="atlas-route route-${number}" href="${href}"><span class="route-index" aria-hidden="true">${number}</span><strong>${title}</strong><span class="atlas-description">${description}</span><span class="atlas-arrow" aria-hidden="true">↗</span></a>`).join("")}</nav>
  <div class="atlas-shortcuts"><span>Ready to plan?</span><a href="/packages">Compare website packages →</a><a href="/process">How projects work →</a><a href="/book">Book a discovery call →</a></div></div></section>
  <section class="library-closing" aria-labelledby="library-closing-title"><img src="/visuals/library/closing-home.webp" alt="" width="1536" height="1024" loading="lazy"><div class="container"><h2 id="library-closing-title">Have a task in mind?</h2><p>Let’s work out what would help.</p><a class="button button-primary" href="/start">Tell us about it ↗</a></div></section></main>`;
}
