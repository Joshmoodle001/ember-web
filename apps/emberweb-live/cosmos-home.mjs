const worlds = [
  ["/work", "Solutions", "Find a website, app or workflow that fits the way you work.", "genesis-planet-v2.webp", "01"],
  ["/ai-lab", "AI Lab", "Try six examples for business planning, admin and everyday life.", "genesis-nebula-v2.jpg", "02"],
  ["/portfolio", "Portfolio", "See the applications we’ve built and what each one does.", "genesis-moon-v2.webp", "03"],
  ["/planet-ember", "Planet Ember", "Meet your crew. See how we take an idea from a sketch to launch.", "ember-homeworld-v1.webp", "04"],
];

export function cosmosHome() {
  return `<main id="main-content" class="page page-home"><section class="atlas-arrival" id="top" data-cosmos-scene="0" aria-labelledby="arrival-title"><div class="container atlas-arrival-inner">
  <div class="atlas-planetarium" aria-hidden="true"><div class="atlas-track"></div><img src="/visuals/ember-homeworld-v1.webp" width="1254" height="1254" fetchpriority="high" alt=""><span class="atlas-target">+ &nbsp; PLANET EMBER</span></div>
  <div class="atlas-copy"><p class="atlas-label"><i></i> EMBERWEB &nbsp; / &nbsp; DIGITAL STUDIO</p><h1 id="arrival-title">What will you<br><em>build next?</em></h1>
  <p>We build websites, apps and AI tools. Bring us the idea you want to launch, or the part of your working day you’d love to change.</p>
  <div class="hero-actions"><a class="button button-primary" href="#explore">Choose a destination <span aria-hidden="true">↓</span></a><a class="atlas-link" href="/start">Build with Ember <span aria-hidden="true">↗</span></a></div></div>
  <div class="atlas-edge"><span>THE EMBER UNIVERSE &nbsp; / &nbsp; FIELD GUIDE</span><button type="button" class="universe-replay">↻ &nbsp; Replay opening</button></div></div></section>
  <section class="atlas-directory" id="explore" data-cosmos-scene="3.2" aria-labelledby="atlas-title"><div class="container"><p class="atlas-label"><i></i> FLIGHT DIRECTORY &nbsp; / &nbsp; 01—04</p><h2 id="atlas-title">Where to <em>next?</em></h2>
  <nav class="atlas-routes" aria-label="Choose a destination">${worlds.map(([href,title,description,image,number])=>`<a class="atlas-route route-${number}" href="${href}"><span class="atlas-specimen" aria-hidden="true"><img src="/visuals/${image}" alt="" loading="lazy" width="160" height="100"></span><span class="atlas-number">${number}</span><strong>${title}</strong><span class="atlas-description">${description}</span><span class="atlas-arrow" aria-hidden="true">↗</span></a>`).join("")}</nav>
  <div class="atlas-shortcuts"><span>Ready to plan?</span><a href="/packages">Compare pricing →</a><a href="/process">How projects work →</a><a href="/book">Book a discovery call →</a></div></div></section>
  <div class="cosmos-flight-tools"><button class="motion-toggle" type="button" aria-pressed="false" hidden>Pause motion</button></div></main>`;
}
