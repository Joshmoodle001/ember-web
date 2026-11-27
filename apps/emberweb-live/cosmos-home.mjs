const worlds = [
  ["/work", "Solutions", "Find a website, app or workflow that fits the way you work."],
  ["/ai-lab", "AI Lab", "Try six examples for business planning, admin and everyday life."],
  ["/portfolio", "Portfolio", "See the applications we’ve built and what each one does."],
  ["/studio", "Our studio", "Meet your crew. See how we take an idea from a sketch to launch."],
];

function chapterArtwork(name) {
  return `<picture class="home-chapter-art" aria-hidden="true"><source srcset="/visuals/library/${name}-768.webp 768w, /visuals/library/${name}.webp 1536w" sizes="100vw"><img src="/visuals/library/${name}.webp" alt="" width="1536" height="1024" loading="lazy" decoding="async"></picture>`;
}

export function cosmosHome() {
  return `<main id="main-content" class="page page-home">
  <div class="home-helix-stage" aria-hidden="true"><div class="home-helix-viewport"><canvas></canvas></div></div>
  <section class="atlas-arrival" id="top" aria-labelledby="arrival-title"><div class="container atlas-arrival-inner">
  <div class="atlas-copy"><div class="home-welcome"><span class="home-welcome-mark" aria-hidden="true"><img src="/brand/ember-mark.svg" alt="" width="64" height="64"></span><span class="home-welcome-text">Welcome.</span></div><p class="crafted-services">AI development · Apps · Websites</p><h1 id="arrival-title">Build what’s next.<br><em>With AI.</em></h1>
  <p>We design websites, build custom web apps and automate everyday work for South African businesses.</p>
  <div class="hero-actions"><a class="button button-primary" href="/start">Start a project <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 13 13 3M5 3h8v8"/></svg></a><a class="atlas-link" href="/portfolio">See our work <span aria-hidden="true">→</span></a></div></div>
  <div class="atlas-edge"><a class="atlas-scroll-cue" href="#explore">Find your next step <span aria-hidden="true">↓</span></a><button type="button" class="universe-replay" hidden>Play opening film</button></div></div></section>
  <section class="atlas-directory home-chapter" id="explore" aria-labelledby="atlas-title">${chapterArtwork("hero-solutions")}<div class="container home-chapter-content"><h2 id="atlas-title">A better way<br><em>to work.</em></h2>
  <nav class="atlas-routes" aria-label="Choose a destination">${worlds.map(([href,title,description])=>`<a class="atlas-route" href="${href}"><strong>${title}</strong><span class="atlas-description">${description}</span><span class="atlas-arrow" aria-hidden="true">↗</span></a>`).join("")}</nav>
  <div class="atlas-shortcuts"><span>Ready to plan?</span><a href="/packages">Compare website packages →</a><a href="/process">How projects work →</a><a href="/book">Book a discovery call →</a></div></div></section>
  <section class="home-chapter home-work" id="selected-work" aria-labelledby="home-work-title">${chapterArtwork("hero-portfolio")}
    <div class="container home-chapter-content"><div class="home-chapter-copy">
      <p class="eyebrow">Selected work</p><h2 id="home-work-title">See what we’ve built.</h2>
      <ul class="home-example-list">
        <li><a href="/portfolio#portfolio-me-body">Me Body <span aria-hidden="true">↗</span></a><p>Food, training and progress logs in a phone-friendly app.</p></li>
        <li><a href="/portfolio#portfolio-kingdom-index">Kingdom Index <span aria-hidden="true">↗</span></a><p>A learning hub with reading collections and different paths for adults and younger readers.</p></li>
      </ul>
      <a class="atlas-link" href="/portfolio">Explore the whole portfolio <span aria-hidden="true">→</span></a>
    </div></div>
  </section>
  <section class="home-chapter home-process" id="project-process" aria-labelledby="home-process-title">${chapterArtwork("hero-process")}
    <div class="container home-chapter-content"><div class="home-chapter-copy">
      <p class="eyebrow">How we work</p><h2 id="home-process-title">From your idea to launch.</h2>
      <ol class="home-example-list">
        <li><strong>Share the job you need done.</strong><p>Tell us what should work better and who it’s for.</p></li>
        <li><strong>Agree the scope and price.</strong><p>We’ll propose what to build and what it will cost.</p></li>
        <li><strong>Review it before launch.</strong><p>Try a working version and agree the handover.</p></li>
      </ol>
      <a class="atlas-link" href="/process">See how a project works <span aria-hidden="true">→</span></a>
    </div></div>
  </section>
  <section class="library-closing home-chapter home-contact" aria-labelledby="library-closing-title">${chapterArtwork("closing-home")}<div class="container home-chapter-content"><div class="home-chapter-copy"><h2 id="library-closing-title">Have a task in mind?</h2><p>Let’s work out what would help.</p><a class="button button-primary" href="/start">Tell us about it</a></div></div></section></main>`;
}
