import { PORTFOLIO_PROJECTS } from "./project-inventory.mjs";
export { PORTFOLIO_PROJECTS };

const escape = value => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const categories = Object.freeze([
  Object.freeze({ id: "business-systems", name: "Business systems", copy: "Give everyday operations a clearer place to happen." }),
  Object.freeze({ id: "web-platforms", name: "Web platforms", copy: "Connect information, customers and the people doing the work." }),
  Object.freeze({ id: "mobile-consumer", name: "Mobile & consumer", copy: "Useful experiences that fit into a day, and into a pocket." }),
  Object.freeze({ id: "content-learning", name: "Content & learning", copy: "Make information easier to explore, understand and return to." }),
]);

function enquiryUrl(project) {
  return "/start?" + new URLSearchParams({ service: project.service, goal: project.goal }).toString();
}

function projectCard(project) {
  const publicLink = project.url
    ? `<a class="text-link" href="${escape(project.url)}" target="_blank" rel="noopener noreferrer">Visit ${escape(project.name)}<span class="sr-only"> (opens in a new tab)</span><span aria-hidden="true">↗</span></a>`
    : '<p class="portfolio-private-note portfolio-access">Project access by arrangement.</p>';
  return `<article class="portfolio-card${project.featured ? " portfolio-card-featured" : ""}" id="portfolio-${escape(project.id)}">
    <figure class="portfolio-figure">
      <img class="portfolio-image" src="/portfolio/${escape(project.image)}.svg" alt="${escape(project.alt)}" width="1200" height="800" loading="lazy" decoding="async">
      <figcaption class="portfolio-visual-note">Illustrative interface · no client data</figcaption>
    </figure>
    <div class="portfolio-copy portfolio-card-copy">
      <p class="portfolio-card-type">${escape(project.type)}</p>
      <h3>${escape(project.name)}</h3>
      <p class="portfolio-summary">${escape(project.summary)}</p>
      <ul class="portfolio-tags" aria-label="${escape(project.name)} capabilities">${project.capabilities.map(capability => `<li>${escape(capability)}</li>`).join("")}</ul>
      <div class="portfolio-card-actions portfolio-actions"><a class="button button-primary" href="${escape(enquiryUrl(project))}">Build something like this <span aria-hidden="true">↗</span></a>${publicLink}</div>
    </div>
  </article>`;
}

export function renderPortfolio() {
  return `<main id="main-content" class="page page-portfolio">
    <section class="sub-hero section portfolio-intro"><div class="container">
      <p class="eyebrow">Selected applications</p>
      <h1>Projects we’ve built.</h1>
      <div class="sub-hero-foot"><p class="lead">Explore custom web apps, client portals and mobile experiences, from attendance and fuel reporting to forms connected to Google Sheets. Each example describes its purpose and capabilities.</p></div>
      <nav class="portfolio-jump-links portfolio-jumps" aria-label="Portfolio categories">${categories.map(category => `<a href="#portfolio-category-${category.id}">${escape(category.name)} <span aria-hidden="true">↓</span></a>`).join("")}</nav>
      <p class="portfolio-intro-note portfolio-disclosure">Private projects use illustrations to protect client data.</p>
      <p><a class="text-link" href="/work">Explore website design, custom apps and automation services →</a></p>
    </div></section>
    ${categories.map(category => `<section class="section portfolio-category portfolio-section" id="portfolio-category-${category.id}" aria-labelledby="portfolio-heading-${category.id}"><div class="container"><header class="portfolio-category-heading section-head"><h2 id="portfolio-heading-${category.id}">${escape(category.name)}</h2></header><div class="portfolio-grid">${PORTFOLIO_PROJECTS.filter(project => project.category === category.id).map(projectCard).join("")}</div></div></section>`).join("")}
    <section class="cta-panel section portfolio-next portfolio-closing"><div class="container"><p class="eyebrow">Your idea could be next</p><h2>What would make<br>your work easier?</h2><p class="lead">Tell us the goal. We will help you choose a focused first build.</p><div class="actions"><a class="button button-primary" href="/start?service=Custom%20web%20app&amp;goal=Discuss%20a%20project%20from%20the%20portfolio">Talk about your idea <span aria-hidden="true">↗</span></a><a class="button button-secondary" href="/book">Book a discovery call <span aria-hidden="true">→</span></a></div></div></section>
  </main>`;
}
