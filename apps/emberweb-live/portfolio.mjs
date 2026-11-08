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

const projects = [
  {
    id: "biosync", name: "BioSync", category: "business-systems", type: "EmberWeb product", featured: true,
    summary: "One workspace for attendance, shifts and leave, giving teams a clearer view of who is working and when.",
    capabilities: ["Attendance reporting", "Rosters & scheduling", "Multi-organisation access"],
    image: "attendance", alt: "Illustration of an attendance workspace with a weekly roster and reporting panels.",
    url: "https://app-biosync.co.za/", service: "Custom web app", goal: "Discuss an attendance and scheduling system like BioSync",
  },
  {
    id: "fuel-intelligence", name: "Fuel Intelligence", category: "business-systems", type: "Private business system",
    summary: "A focused fleet workspace for fuel reporting, review and audit controls, keeping the process in one place.",
    capabilities: ["Fuel reporting", "Review controls", "Audit workflow"],
    image: "fuel", alt: "Illustration of a fuel reporting dashboard with a usage chart and a review queue.",
    service: "Custom web app", goal: "Discuss a fuel reporting and review workspace",
  },
  {
    id: "asset-management", name: "Asset management", category: "business-systems", type: "Private business system",
    summary: "A working register for equipment, custody and regional allocations, helping teams keep track of devices and their handovers.",
    capabilities: ["Equipment register", "Custody history", "Regional allocations"],
    image: "assets", alt: "Illustration of a device register with laptops, tablets and allocation records.",
    service: "Custom web app", goal: "Discuss a device and asset management system",
  },
  {
    id: "shift-planning", name: "Shift planning", category: "business-systems", type: "Private business tool",
    summary: "Build a weekly working pattern, review the shift sheet and save a printable PDF record.",
    capabilities: ["Weekly shift patterns", "Form-based planning", "Printable PDF records"],
    image: "shifts", alt: "Illustration of a weekly shift planner alongside a printable shift sheet.",
    service: "Custom web app", goal: "Discuss a shift planning and document generation tool",
  },
  {
    id: "expiry-reporting", name: "Stock expiry reporting", category: "business-systems", type: "Private business tool",
    summary: "Make a stock report easier to capture: choose the store, identify the product, then add its date and quantity.",
    capabilities: ["Store-based capture", "Barcode entry", "Expiry dates & quantities"],
    image: "expiry", alt: "Illustration of a mobile stock report with a barcode, expiry date and quantity fields.",
    service: "Custom web app", goal: "Discuss a mobile stock and expiry reporting tool",
  },
  {
    id: "digital-signage", name: "Digital signage", category: "business-systems", type: "Private display system",
    summary: "Give reception and training-room screens their own display experiences, with a simple place to choose what to run.",
    capabilities: ["Room-based displays", "Screen selection", "Browser playback"],
    image: "signage", alt: "Illustration of reception and training-room display screens with a display selector.",
    service: "Custom web app", goal: "Discuss a digital signage and display experience",
  },
  {
    id: "digital-catalogue", name: "Digital catalogue", category: "web-platforms", type: "Private business platform",
    summary: "A shared product reference with separate sign-in paths for field teams, representatives and administrators.",
    capabilities: ["Product catalogue", "Field-team access", "Role-based entry"],
    image: "catalogue", alt: "Illustration of a digital product catalogue with category navigation and product cards.",
    service: "Custom web app", goal: "Discuss a digital catalogue for customers or field teams",
  },
  {
    id: "flexiform", name: "FlexiForm", category: "web-platforms", type: "Web application",
    summary: "Give a Google Sheet a friendlier front end: build a form, map its fields to columns and collect submissions through a shared link.",
    capabilities: ["Google Sheets connection", "Custom form fields", "Submission capture"],
    image: "forms", alt: "Illustration of a custom form connected to spreadsheet columns.",
    url: "https://flexi-form-wine.vercel.app/", service: "Workflow automation", goal: "Discuss a form and spreadsheet workflow like FlexiForm",
  },
  {
    id: "emberweb-workspace", name: "EmberWeb workspace", category: "web-platforms", type: "Private EmberWeb platform",
    summary: "A shared home for client projects, invoices and requests, with separate views for clients and the team managing the work.",
    capabilities: ["Client dashboards", "Projects & invoices", "Requests & team access"],
    image: "workspace", alt: "Illustration of a client workspace with project progress, an invoice area and a request thread.",
    service: "Custom web app", goal: "Discuss a client portal and project management workspace",
  },
  {
    id: "me-body", name: "Me Body", category: "mobile-consumer", type: "Consumer web app",
    summary: "An installable, local-first experience for food, workouts and personal progress, designed around everyday use on a phone.",
    capabilities: ["Nutrition & workout logs", "Local-first storage", "Installable PWA"],
    image: "wellness", alt: "Illustration of a mobile wellness app with activity, food and progress panels.",
    url: "https://me-body.vercel.app/", service: "Custom web app", goal: "Discuss a local-first consumer app like Me Body",
  },
  {
    id: "team-broadcasts", name: "Team broadcasts", category: "mobile-consumer", type: "Private communications app",
    summary: "Put team updates, images and videos into a mobile-first feed, with a separate desktop experience for administrators to post.",
    capabilities: ["Mobile update feed", "Image & video posts", "Installable experience"],
    image: "broadcasts", alt: "Illustration of a mobile team-update feed beside a desktop publishing panel.",
    service: "Custom web app", goal: "Discuss a mobile team communications and broadcast app",
  },
  {
    id: "kingdom-index", name: "Kingdom Index", category: "content-learning", type: "Content & learning platform",
    summary: "A Christian content hub with age-group pathways, making the starting point clear for adults and supervised younger visitors.",
    capabilities: ["Age-group pathways", "Content discovery", "Guided entry"],
    image: "learning", alt: "Illustration of a learning hub with reading collections and audience pathways.",
    url: "https://web-three-rust-49.vercel.app/", service: "Custom web app", goal: "Discuss a content and learning platform like Kingdom Index",
  },
];

export const PORTFOLIO_PROJECTS = Object.freeze(projects.map(project => Object.freeze({
  ...project,
  capabilities: Object.freeze([...project.capabilities]),
})));

function enquiryUrl(project) {
  return "/start?" + new URLSearchParams({ service: project.service, goal: project.goal }).toString();
}

function projectCard(project) {
  const publicLink = project.url
    ? `<a class="text-link" href="${escape(project.url)}" target="_blank" rel="noopener noreferrer">Visit ${escape(project.name)}<span class="sr-only"> (opens in a new tab)</span><span aria-hidden="true">↗</span></a>`
    : '<p class="portfolio-private-note portfolio-access">Private project · demonstration available by arrangement.</p>';
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
      <div class="sub-hero-foot"><p class="lead">Browse attendance systems, reporting tools, mobile apps and learning platforms. Each entry describes the job the software does.</p></div>
      <nav class="portfolio-jump-links portfolio-jumps" aria-label="Portfolio categories">${categories.map(category => `<a href="#portfolio-category-${category.id}">${escape(category.name)} <span aria-hidden="true">↓</span></a>`).join("")}</nav>
      <p class="portfolio-intro-note portfolio-disclosure">Private projects use illustrations to protect client data.</p>
    </div></section>
    ${categories.map(category => `<section class="section portfolio-category portfolio-section" id="portfolio-category-${category.id}" aria-labelledby="portfolio-heading-${category.id}"><div class="container"><header class="portfolio-category-heading section-head"><h2 id="portfolio-heading-${category.id}">${escape(category.name)}</h2></header><div class="portfolio-grid">${PORTFOLIO_PROJECTS.filter(project => project.category === category.id).map(projectCard).join("")}</div></div></section>`).join("")}
    <section class="cta-panel section portfolio-next portfolio-closing"><div class="container"><p class="eyebrow">Your idea could be next</p><h2>What would make<br>your work easier?</h2><p class="lead">Tell us the goal. We will help you choose a focused first build.</p><div class="actions"><a class="button button-primary" href="/start?service=Custom%20web%20app&amp;goal=Discuss%20a%20project%20from%20the%20portfolio">Talk about your idea <span aria-hidden="true">↗</span></a><a class="button button-secondary" href="/book">Book a discovery call <span aria-hidden="true">→</span></a></div></div></section>
  </main>`;
}
