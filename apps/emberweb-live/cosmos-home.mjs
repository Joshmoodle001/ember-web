const worlds = [
  ["/work", "Solutions", "Find a website, app or workflow that fits the way you work.", "ember-building-v2.webp", "01"],
  ["/ai-lab", "AI Lab", "Try six examples for business planning, admin and everyday life.", "ember-building-v2.webp", "02"],
  ["/portfolio", "Portfolio", "See the applications we’ve built and what each one does.", "ember-planning-v2.webp", "03"],
  ["/studio", "Our studio", "Meet your crew. See how we take an idea from a sketch to launch.", "ember-welcome-v2.webp", "04"],
];

export function cosmosHome() {
  return `<main id="main-content" class="page page-home"><section class="atlas-arrival" id="top" data-cosmos-scene="0" aria-labelledby="arrival-title"><div class="container atlas-arrival-inner">
  <div class="studio-engine" aria-hidden="true"><div class="engine-ring"></div><img src="/brand/ember-welcome-v2.webp" alt="" width="768" height="768"><div class="engine-layer engine-request"><span>Customer request</span><strong>“Can I book a service?”</strong></div><div class="engine-layer engine-context"><span>Connected tools</span><strong>Bookings · Documents · Customer records</strong></div><div class="engine-layer engine-review"><span>Your team</span><strong>Review → Approve → Send</strong></div></div>
  <div class="atlas-copy"><h1 id="arrival-title">AI for the way<br><em>you work.</em></h1>
  <p>We build AI tools, apps and websites that connect your business. Start with a task, a process or a product you want to build.</p>
  <div class="hero-actions"><a class="button button-primary" href="/start">Start a project ↗</a><a class="atlas-link" href="/portfolio">See our work →</a></div></div>
  <div class="atlas-edge"><button type="button" class="universe-replay">↻ &nbsp; Replay opening</button></div></div></section>
  <section class="atlas-directory" id="explore" data-cosmos-scene="3.2" aria-labelledby="atlas-title"><div class="container"><h2 id="atlas-title">What do you<br><em>want to improve?</em></h2>
  <nav class="atlas-routes" aria-label="Choose a destination">${worlds.map(([href,title,description,image,number])=>`<a class="atlas-route route-${number}" href="${href}"><span class="atlas-specimen" aria-hidden="true"><img src="/brand/${image}" alt="" loading="lazy" width="160" height="100"></span><strong>${title}</strong><span class="atlas-description">${description}</span><span class="atlas-arrow" aria-hidden="true">↗</span></a>`).join("")}</nav>
  <div class="atlas-shortcuts"><span>Ready to plan?</span><a href="/packages">Compare pricing →</a><a href="/process">How projects work →</a><a href="/book">Book a discovery call →</a></div></div></section>
  <div class="cosmos-flight-tools"><button class="motion-toggle" type="button" aria-pressed="false" hidden>Pause motion</button></div></main>`;
}
