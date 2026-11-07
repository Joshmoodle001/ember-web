// Maintained presentation layer for the captured public pages.
const heroOrbits = `<svg class="hero-orbits" viewBox="0 0 1000 1000" aria-hidden="true" focusable="false"><defs><linearGradient id="ember-orbit-gradient" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#20acd7"/><stop offset=".5" stop-color="#c8fc37"/><stop offset="1" stop-color="#ef5b30"/></linearGradient></defs><g fill="none" stroke="url(#ember-orbit-gradient)" stroke-width="1.5"><circle cx="500" cy="500" r="430" opacity=".45"/><ellipse cx="500" cy="500" rx="465" ry="215" transform="rotate(-32 500 500)" opacity=".55"/><ellipse cx="500" cy="500" rx="260" ry="470" transform="rotate(28 500 500)" opacity=".35"/></g><g class="orbit-slow" fill="none" stroke="#c8fc37" stroke-width="3"><circle cx="500" cy="500" r="430" pathLength="1" stroke-dasharray=".14 .86"/><circle cx="930" cy="500" r="6" fill="#c8fc37" stroke="none"/></g><g class="orbit-counter" fill="none" stroke="#20acd7" stroke-width="2"><circle cx="500" cy="500" r="375" pathLength="1" stroke-dasharray=".08 .42 .08 .42"/><path d="M500 102v-14m0 824v-14M102 500H88m824 0h-14" opacity=".9"/></g></svg>`;
const sigils = [
  '<path d="M16 32 32 16 48 32 32 48Z M24 24l16 16m0-16L24 40"/><path d="M10 26v-8h8m28 0h8v8m0 20v8h-8m-28 0h-8v-8"/>',
  '<circle cx="32" cy="32" r="8"/><ellipse cx="32" cy="32" rx="26" ry="12" transform="rotate(-32 32 32)"/><ellipse cx="32" cy="32" rx="12" ry="26" transform="rotate(-32 32 32)"/>',
  '<path d="M12 44 32 24 52 44M12 32 32 12 52 32M20 52h24"/><circle cx="32" cy="24" r="3" fill="currentColor" stroke="none"/>',
];
const journey = `<section class="journey" aria-labelledby="journey-heading"><div class="journey-heading"><p class="section-label">[ From idea to launch ]</p><h2 id="journey-heading">A clear path.<br><em>At every step.</em></h2><p>Start with a conversation. Agree the scope and price before the build begins.</p></div><ol class="journey-steps"><li><span>01</span><h3>Tell us your goal</h3><p>Share a short brief for your website, app or AI workflow.</p><a href="/start">Start your brief →</a></li><li><span>02</span><h3>Meet &amp; agree the plan</h3><p>Book a discovery call. We’ll discuss the details and prepare a proposal.</p><a href="/book">Book a discovery call →</a></li><li><span>03</span><h3>Approve, build &amp; launch</h3><p>Agree the scope, receive a private invoice link, then review the work as it takes shape.</p><a href="/process">See how it works →</a></li></ol></section>`;

export function refinePage(html, pagePath) {
  html = html.replace(/<main\b([^>]*)>/i, (tag, attrs) => /\bid=/.test(attrs) ? tag : `<main id="main-content"${attrs}>`);
  html = html.replace(/<\/head>/i, '<link rel="stylesheet" href="/refinements.css?v=20261013c"></head>');
  html = html.replace(/<\/head>/i, '<link rel="stylesheet" href="/motion.css?v=20261013-motion1"></head>');
  html = html.replace(/<\/body>/i, '<script src="/motion.js?v=20261013-motion1" defer></script></body>');
  // Keep navigation compact and put booking within easy reach.
  html = html.replace(/(<div class="site-nav-links">[\s\S]*?)<a href="\/industries"[^>]*>Industries<\/a>/, '$1<a href="/book">Book a call</a>');
  html = html.replace(/(<div class="mobile-nav[^>]*>[\s\S]*?)<a href="\/industries"[^>]*>[\s\S]*?<\/a>/, '$1<a href="/book" tabindex="-1"><span>05</span>Book a call<b aria-hidden="true">→</b></a>');
  if (pagePath === "/") {
    html = html.replace(/<div class="hero-foot">[\s\S]*?<\/div>/, `<div class="hero-foot"><p>Websites, apps and practical AI automation for South African businesses. Turn your next idea into a clear plan and a site that works.</p><div class="hero-actions"><a class="action-primary" href="/start">Start a project <span aria-hidden="true">↗</span></a><a class="action-secondary" href="/book">Book a discovery call <span aria-hidden="true">→</span></a></div><p class="hero-reassurance">A short brief. A real conversation. An agreed scope before payment.</p></div>`);
    html = html.replace(/(<section class="marquee"[\s\S]*?<\/section>)/, '$1' + journey);
    html = html.replace(/(<div class="hero-art[^\"]*"[^>]*>)/, '$1' + heroOrbits);
    html = html.replace(/(<section class="hero"[\s\S]*?)(<\/section>)/, '$1<button class="motion-toggle" type="button" aria-pressed="false" hidden>Pause motion</button>$2');
    // Keep the landing page focused; the detailed method has its own route.
    html = html.replace(/<section class="(?:manifesto|scroll-story|method)"[\s\S]*?<\/section>/g, '');
    html = html.replace(/<span>0<!-- -->1<!-- --> \/ 03<\/span>/, '<span>Choose your starting point</span>');
    html = html.replace('A small, senior team for the digital moments that can change the direction of your business.', 'Web design, ongoing support and useful AI workflows — shaped around what your business needs.');
    html = html.replace('Web experiences</h3>', 'Websites &amp; apps</h3>');
    html = html.replace('Systems that flow</h3>', 'AI &amp; automation</h3>');
    html = html.replaceAll('Explore this <span', 'Discuss this service <span');
  }
  let sigilIndex = 0;
  html = html.replace(/(<li><span>0[123]<\/span>)(?=<h3>)/g, (match) => match + `<svg class="journey-sigil" viewBox="0 0 64 64" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5">${sigils[sigilIndex++ % 3]}</svg>`);
  html = html.replaceAll('Book a 15-min chat', 'Book a discovery call');
  html = html.replace(/href="\/start\?source=packages-chat"/g, 'href="/book"');
  if (pagePath === '/audit') {
    html = html.replace('</header><section', '<div class="sub-hero-actions"><a class="action-primary" href="#request">Request your free audit <span aria-hidden="true">→</span></a></div></header><section');
  }
  if (pagePath === '/industries') {
    const descriptions = [
      'Help local customers find your service area, see your work and request a quote from their phone.',
      'Make treatments, pricing and appointment booking easy to find, with a clear route from interest to enquiry.',
      'Explain your expertise, show the right credentials and make it easy for clients to arrange a conversation.',
      'Bring menus, products, location and booking or order enquiries into one clear customer journey.',
      'Present properties and project work clearly, then capture qualified enquiries with the details your team needs.',
      'Connect your courses, programmes and expertise to a simple booking or enrolment enquiry.',
    ];
    let index = 0;
    html = html.replaceAll('We shape the customer journey around the questions, proof and next step your customers actually need.', () => descriptions[index++] ?? descriptions[0]);
  }
  if (pagePath === "/start" || pagePath === "/audit") {
    html = html.replace(/<form method="dialog">/, `<form method="dialog" aria-labelledby="brief-heading"><div class="brief-intro wide"><p class="section-label">[ Step 1 · Share your brief ]</p><h2 id="brief-heading">${pagePath === '/audit' ? 'What would you like us to review?' : 'Let’s start with your goal.'}</h2><p>Fields marked * are required. After sending, choose a discovery time. No account or payment is needed.</p></div>`);
    html = html.replace('<label>Name<input', '<label>Name *<input');
    html = html.replace('<label>Your name<input', '<label>Your name *<input');
    html = html.replace('<label>Business name<input', '<label>Business name *<input');
    html = html.replace('<label>Email<input', '<label>Email *<input');
    html = html.replace('<label>Email address<input', '<label>Email address *<input');
    html = html.replace('<label>Phone / WhatsApp<input', '<label>Phone / WhatsApp <span class="optional">(optional)</span><input type="tel"');
    html = html.replace('<label>Website link<input', '<label>Website link *<input');
    html = html.replace('Anything else we should know?', 'Your project goal *');
    html = html.replace('What would you most like to improve?', 'What would you most like to improve? *');
    html = html.replace(/(<textarea\b[^>]*)(>)/, '$1 aria-describedby="brief-help"$2');
    html = html.replace('</textarea>', '</textarea><span class="field-help" id="brief-help">At least 20 characters. Tell us your goal, what you have now, and what success would look like.</span>');
    html = html.replace(/<input type="checkbox" required>/, '<input type="checkbox" name="contact_consent" required>');
    html = html.replace('I agree that EmberWeb may contact me about this request.', 'I agree that EmberWeb may contact me about this request. *');
    html = html.replace('This month</option>', 'This month</option>');
    html = html.replace('<option>This month</option>', '<option selected>I’m flexible / exploring</option><option>This month</option>');
    html = html.replace('Your brief goes straight to our team. You can book a discovery call after sending.', 'Your request goes to our team. Next: choose a discovery call. We’ll discuss the scope before sending a proposal or private invoice.');
    html = html.replace('Your request goes straight to our team. Then choose a discovery time that suits you.', 'Your request goes to our team. Next: choose a discovery call to discuss the review.');
    html = html.replace(/(<section class="form-section[^>]*>[\s\S]*?<\/section>)/, '$1' + journey);
    // Keep direct contact in the form, rather than floating over controls.
  }
  html = html.replace('No payment on site</h3>', 'Scope before payment</h3>');
  html = html.replace('You can pay the agreed launch fee through secure PayFast checkout.', 'After approving the proposal, you receive a private PayFast invoice link for the agreed amount.');
  html = html.replace('Launch fees are paid securely on PayFast. Monthly EmberCare starts only after scope, timing and the care arrangement have been confirmed.', 'We discuss your scope first, then send a proposal and a private PayFast invoice link for the agreed amount. Monthly care and its payment arrangement are confirmed separately.');
  html = html.replace('No signup needed. Just a useful first conversation about what is possible.', 'Choose a goal to prefill your brief. Send it, then book a discovery call.');
  if (pagePath !== '/') {
    const footer = '<footer class="simple-footer"><a href="/" aria-label="EmberWeb home">EMBERWEB</a><nav aria-label="Footer navigation"><a href="/book">Book a discovery call</a><a href="/industries">Industries</a><a href="/policies">Privacy &amp; policies</a><a href="mailto:info@emberweb.co.za">Email EmberWeb</a><a href="https://wa.me/27723398781" target="_blank" rel="noopener noreferrer">WhatsApp</a></nav><p>© 2026 EmberWeb · South Africa</p></footer>';
    html = html.replace('</main>', '');
    html = html.replace(/(<aside\b[^>]*class="ember-guide[^\"]*"[^>]*>)/, '</main>' + footer + '$1');
  }
  // No inbound MX exists for this domain yet. Offer verified contact routes.
  html = html.replace(/<a\b([^>]*?)href="mailto:info@emberweb\.co\.za[^\"]*"([^>]*)>[\s\S]*?<\/a>/gi, '<a $1href="https://wa.me/27723398781"$2>Message EmberWeb</a>');
  html = html.replaceAll('Prefer email?', 'Prefer a message?');
  html = html.replaceAll('email info@emberweb.co.za.', 'contact us using the project request form or WhatsApp.');
  return html;
}
