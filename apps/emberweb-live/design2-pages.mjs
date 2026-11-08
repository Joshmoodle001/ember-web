import { aiLab } from "./ember-lab.mjs";
import { cosmosHome } from "./cosmos-home.mjs";
import { emberPlanet } from "./ember-planet.mjs";
import { clientPathCards, clientStart } from "./client-paths.mjs";
import { renderPortfolio } from "./portfolio.mjs";
import { signalStudio } from "./signal-studio.mjs";
import { capabilityOverview, workflowExplorer, solutionGallery, connectedSystems, customBuildOptions, studioPrinciples } from "./solutions.mjs";

const plans = [
  {
    slug: "launch-lite",
    audience: "New businesses",
    name: "Launch Lite",
    tagline: "A smart, credible first presence.",
    description: "One page with your offer, contact details and a way for customers to enquire.",
    launch: "R1,500",
    care: "R799",
    features: ["One focused launch page", "Mobile-first layout", "WhatsApp and enquiry pathways", "Managed hosting, SSL and backups"],
  },
  {
    slug: "starter",
    audience: "Service businesses",
    name: "Starter",
    tagline: "Turn attention into leads.",
    description: "A website with space for your services, customer questions and an enquiry form.",
    launch: "R2,500",
    care: "R999",
    features: ["Multi-section website experience", "Lead-focused calls to action", "Google-ready SEO foundations", "Everything in Launch Lite"],
  },
  {
    slug: "business",
    audience: "Established teams",
    name: "Business",
    tagline: "Make the site part of the operation.",
    description: "For teams that need separate service pages and a clearer path from enquiry to booking.",
    launch: "R4,000",
    care: "R1,250",
    features: ["More detailed content journeys", "Forms, integrations and automations", "Conversion-led structure", "Everything in Starter"],
  },
  {
    slug: "growth",
    audience: "Ambitious teams",
    name: "Growth",
    tagline: "Build beyond a brochure site.",
    description: "A custom build for a website that needs to connect with other parts of your business.",
    launch: "From R6,000",
    care: "R1,500",
    features: ["Custom digital experience", "Automation planning", "Dashboard, app or integration scope", "Ongoing strategic support"],
  },
];

export const PACKAGE_PLANS = Object.freeze(plans.map((plan) => Object.freeze({
  ...plan,
  features: Object.freeze([...plan.features]),
})));

const html = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const waUrl = "https://wa.me/27723398781";

function button(href, label, primary = false) {
  return `<a class="button ${primary ? "button-primary action-primary" : "button-secondary action-secondary"}" href="${html(href)}">${label}<span aria-hidden="true">${primary ? "↗" : "→"}</span></a>`;
}

function sectionHead(eyebrow, title, copy = "", className = "") {
  return `<header class="section-head${className ? ` ${className}` : ""}"><p class="eyebrow">${eyebrow}</p><h2>${title}</h2>${copy ? `<p class="lead">${copy}</p>` : ""}</header>`;
}

function subHero(eyebrow, title, copy, extra = "") {
  return `<section class="sub-hero section"><div class="container"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><div class="sub-hero-foot"><p class="lead">${copy}</p>${extra}</div></div></section>`;
}

function packageCard(plan, featured = false) {
  return `<article class="card package-card${featured ? " card-featured" : ""}"><p class="eyebrow">${plan.audience}</p><h3>${plan.name}</h3><p class="package-description">${plan.description}</p><div class="package-prices"><p><span>Once-off launch</span><strong>${plan.launch}</strong></p><p><span>EmberCare · monthly</span><strong>${plan.care}<small> / month</small></strong></p></div><ul class="feature-list">${plan.features.map((feature) => `<li>${feature}</li>`).join("")}</ul>${button(`/start?package=${encodeURIComponent(plan.slug)}`, `Discuss ${plan.name}`, featured)}</article>`;
}

function journey(art) {
  const sigils = Array.isArray(art?.sigils) ? art.sigils : [];
  const steps = [
    ["01", "Tell us your goal", "Tell us about your idea or business and the first thing you want to move forward.", "/start", "Start a brief"],
    ["02", "Meet and agree the plan", "Book a discovery call. We will confirm the scope, timing and price in a proposal.", "/book", "Book a discovery call"],
    ["03", "Approve, then build", "Accept the proposal first. If payment is due, your private invoice link follows.", "/process", "See the process"],
  ];
  return `<section class="journey section section-light" id="journey"><div class="container">${sectionHead("A clear route", "From first idea to launch.", "You will know what is included and what it costs before work begins.", "journey-heading")}<ol class="journey-steps">${steps.map(([number, title, copy, href, link], index) => `<li class="card">${sigils[index] ?? ""}<span class="step-number">${number}</span><h3>${title}</h3><p>${copy}</p><a class="text-link" href="${href}">${link} <span aria-hidden="true">→</span></a></li>`).join("")}</ol></div></section>`;
}

function priceSnapshot() {
  return `<section class="section section-ink pricing-section"><div class="container">${sectionHead("Straightforward pricing", "Choose a useful starting point.", "One-off launch fees and monthly EmberCare are shown separately. Final scope is agreed in writing.")}<div class="package-grid package-grid-compact">${PACKAGE_PLANS.map((plan) => `<article class="card package-card"><p class="eyebrow">${plan.audience}</p><h3>${plan.name}</h3><p class="package-price-line"><span>Once-off launch</span><strong>${plan.launch}</strong></p><p class="package-price-line"><span>EmberCare monthly</span><strong>${plan.care}</strong></p><a class="text-link" href="/start?package=${encodeURIComponent(plan.slug)}">Discuss ${plan.name} <span aria-hidden="true">→</span></a></article>`).join("")}</div><p class="section-note">A private invoice is shared only after you have reviewed and accepted the proposal. There is no public checkout.</p><div class="actions">${button("/packages", "Compare all packages", true)}</div></div></section>`;
}

function finalCta(title = "Talk to us about your project.", copy = "Send a short brief or book a 30-minute call.") {
  return `<section class="cta-panel section"><div class="container"><h2>${title}</h2><p class="lead">${copy}</p><div class="actions">${button("/start", "Start a project", true)}${button("/book", "Book a discovery call")}</div></div></section>`;
}

function home() {
  return cosmosHome();
}

function workPage() {
  return `<main id="main-content" class="page page-work">${subHero("Solutions", "Websites, apps<br>and automation.", "Give customers a place to book, give your team a shared workspace, or cut the time spent on repeat tasks.", button("/start", "Tell us what you have in mind", true))}${solutionGallery()}${workflowExplorer()}${finalCta("What would you build if it were simpler?", "Tell us about the work, the customers or the idea. We will help you find a useful first step.")}</main>`;
}

function packagesPage() {
  return `<main id="main-content" class="page page-packages">${subHero("Packages and pricing", "Website pricing.", "Compare the once-off build fee and monthly care for each website. We quote separately for custom apps and automation.")}<section class="section section-light"><div class="container"><div class="package-grid">${PACKAGE_PLANS.map((plan, index) => packageCard(plan, index === 1)).join("")}</div><p class="section-note">The exact scope, timing, third-party costs and payment schedule are confirmed in your proposal before work begins. Monthly EmberCare is a separate ongoing service. Prices exclude VAT where applicable. Premium software, payment-gateway fees, content production and advertising spend are quoted separately. Apps and AI projects are quoted to the agreed scope.</p></div></section><section class="section section-ink"><div class="container split"><div>${sectionHead("Before you commit", "How payment works", "First we discuss your goals and agree the scope. You review and accept the proposal; a private invoice link is then shared for any agreed payment.")}</div><div class="card card-wide"><h3>Not sure which package fits?</h3><p>Send a short brief and we will recommend a sensible starting point. Any extra work is scoped separately.</p><div class="actions">${button("/start", "Ask about a package", true)}${button("/book", "Book a call")}</div></div></div></section>${customBuildOptions()}${finalCta()}</main>`;
}

function contactConsent() {
  return `<label class="form-consent"><input type="checkbox" name="contact_consent" required><span>I agree that EmberWeb may contact me about this request.</span></label>`;
}

function formAside(connected, isAudit = false) {
  const submitText = connected ? "Send request" : "Continue to WhatsApp";
  return `<aside class="card form-aside form-next"><p class="eyebrow">What happens next</p><ol class="process-list"><li><strong>We receive your brief</strong><span>${connected ? "Your request is sent to the EmberWeb team." : "Your details are prepared in WhatsApp for you to review and send."}</span></li><li><strong>We talk it through</strong><span>Choose a discovery time that suits you.</span></li><li><strong>We agree the scope</strong><span>Review a proposal before any payment is due.</span></li></ol><p class="micro-note">${isAudit ? "An audit request is a first conversation, not a paid booking." : "No payment is taken on this website."}</p></aside>`;
}

function startPage(connected) {
  return clientStart(connected);
}

function auditPage(connected) {
  const consent = connected ? contactConsent() : "";
  const action = connected ? "Send audit request" : "Continue to WhatsApp";
  return `<main id="main-content" class="page page-audit">${subHero("Free audit", "Request a free review.", "Send your website or describe a task that takes too long. Tell us what you’d like us to look at.")}<section class="section section-light"><div class="container"><div class="audit-choice-grid"><article class="card audit-choice"><p class="eyebrow">Website audit</p><h2>Make the website easier to trust and use.</h2><p>We look at clarity, mobile experience, speed, trust and the path to an enquiry.</p><button class="button button-secondary" type="button">Choose website audit <span aria-hidden="true">↓</span></button></article><article class="card audit-choice"><p class="eyebrow">AI + automation audit</p><h2>Spot repetitive work worth simplifying.</h2><p>We discuss follow-ups, handovers and admin to identify sensible automation opportunities.</p><button class="button button-secondary" type="button">Choose automation audit <span aria-hidden="true">↓</span></button></article></div></div></section><section class="section section-light form-section" id="request"><div class="container"><div class="form-layout"><div class="form-main"><div class="brief-intro"><p class="eyebrow">Step 1 · Share the basics</p><h2 id="brief-heading">What should we review?</h2><p class="lead">Tell us what you want to improve. We will discuss the next step with you.</p></div><form method="dialog" aria-labelledby="brief-heading">
    <label>Audit focus *<select name="focus" required><option value="Website audit" selected>Website audit</option><option value="AI + automation audit">AI + automation audit</option></select></label>
    <label>Your name *<input type="text" name="name" autocomplete="name" required></label>
    <label>Business name *<input type="text" name="business" autocomplete="organization" required></label>
    <label>Website link <input type="url" name="website" autocomplete="url" placeholder="https://" required aria-describedby="website-help"><span id="website-help" class="field-help">Required for a website audit; optional for an automation audit.</span></label>
    <label>Email address *<input type="email" name="email" autocomplete="email" required></label>
    <label class="form-full">What would you most like to improve? *<textarea name="notes" rows="5" minlength="20" maxlength="4000" required aria-describedby="audit-help"></textarea><span class="field-help" id="audit-help">At least 20 characters. Share what feels difficult or what you would like to change.</span></label>
    <input type="hidden" name="package" value="">${consent}<p class="form-note"><a href="/policies">Read our privacy and project policies</a>.</p><button class="button button-primary form-submit" type="submit">${action}<span aria-hidden="true">→</span></button>
    <noscript><p>Please enable JavaScript to send your request, or <a href="${waUrl}">message EmberWeb on WhatsApp</a>.</p></noscript>
  </form></div>${formAside(connected, true)}</div></div></section><section class="section section-ink audit-how"><div class="container">${sectionHead("The review", "Useful next steps, in plain language.", "We keep the focus on the clearest opportunity for your business.")}<div class="process-steps"><article class="card"><span class="step-number">01</span><h3>Share the link or goal</h3><p>Tell us what you would like looked at.</p></article><article class="card"><span class="step-number">02</span><h3>We review the journey</h3><p>We discuss what is working and what could be clearer.</p></article><article class="card"><span class="step-number">03</span><h3>Choose your next step</h3><p>Use the findings to decide what, if anything, to change.</p></article></div></div></section></main>`;
}

function processPage() {
  const steps = [
    ["01", "Start with the job to do", "Choose a new idea or an existing business. Share who you want to help, what you want to make possible, or what feels difficult today."],
    ["02", "Shape a focused first build", "We map the journey, the tools and the useful outcome. A written proposal confirms scope, price, timing and running costs."],
    ["03", "Approve before payment", "Review the proposal. Once accepted, any agreed invoice is shared privately; there is no public checkout."],
    ["04", "Build, test and grow", "Review the design and a working version. We test the important journeys, arrange handover and agree support before launch."],
  ];
  return `<main id="main-content" class="page page-process">${subHero("How it works", "From brief to launch.", "You approve the scope and price before we start. You see a working version before it goes live.")}<section class="section section-light"><div class="container"><div class="process-steps process-list">${steps.map(([number, title, copy]) => `<article class="card"><span class="step-number">${number}</span><h2>${title}</h2><p>${copy}</p></article>`).join("")}</div></div></section><section class="section section-ink process-commitments"><div class="container">${sectionHead("Clear from the start", "A few things we agree in writing.")}<div class="feature-grid"><article class="card"><h3>Scope and price</h3><p>What is included, what costs extra and when invoices are due.</p></article><article class="card"><h3>Access and ownership</h3><p>Your domain, approved content and agreed handover access.</p></article><article class="card"><h3>Care after launch</h3><p>Any recurring service and cancellation terms are confirmed separately.</p></article></div></div></section><section class="section section-light faq"><div class="container">${sectionHead("", "Common questions")}<details><summary>Do I need to have a business already?</summary><p>No. You can start with an idea, a side project or a problem you want to solve. Choose <a href="/start?journey=startup">the new-idea path</a> and we will help you work out a practical first step. A company name and technical plan are not required.</p></details><details><summary>Do I pay before the scope is agreed?</summary><p>We discuss the scope and share a proposal first. Any payment link is private and follows the agreed proposal.</p></details><details><summary>Can I start with a smaller project?</summary><p>Yes. We can discuss a focused first launch and what can wait for a later phase.</p></details><details><summary>Can you build an app or an AI task force?</summary><p>Yes. We can scope portals, internal apps, knowledge engines and coordinated AI workflows. We start with the data, tools and review points the job needs, then agree a focused first version.</p></details><details><summary>How will I follow my project?</summary><p>Use <a href="/login">Customer Login</a> to access the projects and resources explicitly linked to your confirmed account. Your project plan lists review dates and who to contact.</p></details><details><summary>What happens after launch?</summary><p>Your handover and any monthly EmberCare arrangement are agreed before launch.</p></details></div></section>${finalCta()}</main>`;
}

function industriesPage() {
  const industries = [
    ["Trades & field services", "Turn enquiries into well-briefed jobs.", "Service-area website · Quote requests · Job tracking"],
    ["Beauty & wellness", "Make booking and follow-up feel effortless.", "Booking journey · Client reminders · Team workspace"],
    ["Professional services", "Bring expertise, documents and clients together.", "Client portal · Knowledge search · Proposal preparation"],
    ["Retail & hospitality", "Connect the customer experience to the team behind it.", "Product sites · Booking requests · Operations dashboards"],
    ["Property & construction", "Keep projects and people working from the same picture.", "Project portals · Document workflows · Status reporting"],
    ["Growing teams", "Give repeatable work a better home.", "Internal apps · AI task forces · Approval workflows"],
  ];
  return `<main id="main-content" class="page page-industries">${subHero("Built around your business", "What we build<br>in your industry.", "See examples of booking, sales and operations tools for businesses like yours.")}<section class="section section-light"><div class="container"><div class="industry-grid">${industries.map(([title, copy, examples]) => `<article class="card"><h2>${title}</h2><p>${copy}</p><p class="industry-examples">${examples}</p><a class="text-link" href="/start?industry=${encodeURIComponent(title)}&amp;goal=${encodeURIComponent(copy)}">Explore this direction <span aria-hidden="true">→</span></a></article>`).join("")}</div></div></section>${connectedSystems()}${finalCta()}</main>`;
}

function carePage() {
  const benefits = [
    ["Hosting and SSL", "A managed home for the website with the basics kept in place."],
    ["Backups and maintenance", "Routine care for the agreed site and service level."],
    ["Practical support", "A clear route to ask for help when something needs attention."],
    ["Future improvements", "Larger new features are scoped separately so you can decide before work starts."],
  ];
  return `<main id="main-content" class="page page-care">${subHero("EmberCare", "Website care.", "Websites, apps and AI workflows need a clear plan after launch. Hosting, maintenance, support and any model or third-party usage are agreed for your project.")}<section class="section section-light"><div class="container"><div class="care-grid">${benefits.map(([title, copy]) => `<article class="card"><h2>${title}</h2><p>${copy}</p></article>`).join("")}</div></div></section><section class="section section-ink"><div class="container split"><div>${sectionHead("A clear arrangement", "Know what your care covers.", "Your monthly package, support level and cancellation notice are confirmed in the project agreement.")}</div><div class="card card-wide"><p class="eyebrow">Package pricing</p><h3>EmberCare starts at R799 / month.</h3><p>Package-specific monthly amounts are listed alongside launch fees on the pricing page.</p><div class="actions">${button("/packages", "View package prices", true)}${button("/start", "Ask about support")}</div></div></div></section>${finalCta("Need help with an existing site?")}</main>`;
}

function policiesPage() {
  const policies = [
    ["Privacy and POPIA", "We use the details you share to reply to an enquiry, scope work and provide agreed services. We do not sell enquiry information. To ask about or remove personal information held by EmberWeb, use the project request form or WhatsApp."],
    ["Ownership and access", "Your domain remains registered to you. Your approved business content remains yours. Project handover and access are agreed in writing before launch, including any third-party tools required for the work."],
    ["Payments", "We confirm scope, payment schedule, third-party costs and what is included before work begins. When payment is due, EmberWeb sends a private PayFast payment link; payment details are not collected on this website."],
    ["Care and cancellation", "Monthly care covers the agreed service level. Larger new features are scoped separately. Minimum terms and cancellation notice are confirmed in the project agreement so both sides know what to expect."],
    ["Third-party tools", "Websites can rely on hosting, payment, analytics, map, email or booking services selected for the project. Their own terms and privacy practices may apply alongside EmberWeb’s project commitments."],
    ["Plain language first", "These notes explain how we aim to work. Your signed project scope and agreement set the final commercial and legal terms for your specific project."],
  ];
  return `<main id="main-content" class="page page-policies">${subHero("Privacy, ownership and project policies", "Project terms and privacy.", "These notes explain how EmberWeb aims to work. Your signed project scope and agreement set the final terms for your project.")}<section class="section section-light"><div class="container"><div class="policy-list">${policies.map(([title, copy]) => `<article class="card"><h2>${title}</h2><p>${copy}</p></article>`).join("")}</div><p class="film-credit">Opening film adapted from the <a href="https://svs.gsfc.nasa.gov/14576/">black-hole simulation by NASA’s Goddard Space Flight Center, J. Schnittman and B. Powell</a>.</p></div></section>${finalCta("Need to ask about your information?", "Use the project request form or message EmberWeb on WhatsApp.")}</main>`;
}

function safeCalendarUrl(calendarUrl) {
  if (!calendarUrl) return null;
  let url;
  try { url = new URL(calendarUrl); } catch { throw new Error("The booking calendar URL is invalid."); }
  if (url.protocol !== "https:" || url.hostname !== "calendar.google.com" || !/^\/calendar\/appointments\/schedules\/[A-Za-z0-9_-]+$/.test(url.pathname) || url.username || url.password || url.hash) {
    throw new Error("The booking page accepts only the verified Google Calendar schedule URL.");
  }
  // Use Google's generated public embed view, including for signed-in owners.
  url.searchParams.set("gv", "true");
  return url.href;
}

function bookPage(calendarUrl) {
  const src = safeCalendarUrl(calendarUrl);
  const calendar = src
    ? `<div class="actions"><a class="button button-primary" data-calendar-link href="${html(src)}" target="_blank" rel="noopener noreferrer">Choose a time in Google Calendar ↗</a></div><p class="booking-guidance form-note" data-booking-guidance hidden></p>`
    : `<div class="card card-wide booking-fallback"><p class="eyebrow">Booking calendar</p><h2>We are arranging the calendar.</h2><p>Send your project brief and EmberWeb will contact you to find a suitable time.</p>${button("/start", "Share a project brief", true)}</div>`;
  return `<main id="main-content" class="page page-book"><section class="sub-hero section"><div class="container"><p class="eyebrow">Step 2 · Choose a discovery time</p><h1>Book a discovery call.</h1><div class="sub-hero-foot"><p class="lead">In 30 minutes we’ll discuss your project and what it would take to build. If you’ve sent a brief, book with the same email address. Your confirmation includes the Google Meet link.</p></div></div></section><section class="section section-light booking-section"><div class="container">${calendar}</div></section><section class="section section-ink booking-next"><div class="container">${sectionHead("Before you book", "No payment is needed to meet.", "We will agree the scope and price in writing before any payment is due.")}<div class="actions">${button("/start", "Send a project brief", true)}</div></div></section></main>`;
}

export function renderBody(path, { connected = false, calendarUrl = null, art = {} } = {}) {
  const route = String(path).replace(/\/+$/, "") || "/";
  let markup;
  switch (route) {
    case "/": markup = home(art); break;
    case "/ai-lab": markup = `<main id="main-content" class="page page-lab">${aiLab()}</main>`; break;
    case "/studio": markup = `<main id="main-content" class="page page-planet">${emberPlanet()}</main>`; break;
    case "/work": markup = workPage(); break;
    case "/portfolio": markup = renderPortfolio(); break;
    case "/packages": markup = packagesPage(); break;
    case "/audit": markup = auditPage(connected); break;
    case "/process": markup = processPage(); break;
    case "/industries": markup = industriesPage(); break;
    case "/care": markup = carePage(); break;
    case "/start": markup = startPage(connected); break;
    case "/policies": markup = policiesPage(); break;
    case "/book": markup = bookPage(calendarUrl); break;
    default: throw new Error(`No Design 2 body template for ${route}`);
  }
  const outerMain = markup.match(/^<main id="main-content" class="page [^"]+">([\s\S]*)<\/main>$/);
  if (!outerMain) throw new Error(`Design 2 template for ${route} must have one known outer main wrapper.`);
  return outerMain[1];
}
