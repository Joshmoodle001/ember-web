const worlds = [
  ["/work", "Solutions", "Find a website, app or workflow that fits the way you work.", "ember-building-v2.webp", "01"],
  ["/ai-lab", "AI Lab", "Try six examples for business planning, admin and everyday life.", "ember-building-v2.webp", "02"],
  ["/portfolio", "Portfolio", "See the applications we’ve built and what each one does.", "ember-planning-v2.webp", "03"],
  ["/studio", "Our studio", "Meet your crew. See how we take an idea from a sketch to launch.", "ember-welcome-v2.webp", "04"],
];

export function cosmosHome() {
  return `<main id="main-content" class="page page-home"><section class="atlas-arrival" id="top" data-cosmos-scene="0" aria-labelledby="arrival-title"><div class="container atlas-arrival-inner">
  <div class="crafted-hero-art" aria-hidden="true"></div>
  <div class="atlas-copy"><p class="crafted-services">AI development · Apps · Websites</p><h1 id="arrival-title">Build what’s next.<br><em>With AI.</em></h1>
  <p>Turn a business idea into working software. We design AI tools, custom apps and websites that make everyday work easier.</p>
  <div class="hero-actions"><a class="button button-primary" href="/start">Start a project ↗</a><a class="atlas-link" href="/portfolio">See our work →</a></div></div>
  <div class="atlas-edge"><button type="button" class="universe-replay">↻ &nbsp; Replay opening</button></div></div></section>
  <section class="atlas-directory" id="explore" data-cosmos-scene="3.2" aria-labelledby="atlas-title"><div class="container"><h2 id="atlas-title">A better way<br><em>to work.</em></h2>
  <nav class="atlas-routes" aria-label="Choose a destination">${worlds.map(([href,title,description,image,number])=>`<a class="atlas-route route-${number}" href="${href}"><strong>${title}</strong><span class="atlas-description">${description}</span><span class="atlas-arrow" aria-hidden="true">↗</span></a>`).join("")}</nav>
  <div class="atlas-shortcuts"><span>Ready to plan?</span><a href="/packages">Compare pricing →</a><a href="/process">How projects work →</a><a href="/book">Book a discovery call →</a></div></div></section>
  <section class="library-closing" aria-labelledby="library-closing-title"><img src="/visuals/library/closing-home.webp" alt="" width="1536" height="1024" loading="lazy"><div class="container"><h2 id="library-closing-title">Have a task in mind?</h2><p>Let’s work out what would help.</p><a class="button button-primary" href="/start">Tell us about it ↗</a></div></section></main>`;
}
