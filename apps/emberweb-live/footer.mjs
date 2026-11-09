import { COMPANY, whatsappLink } from "./company.mjs";

export function renderFooter() {
  const legal = COMPANY.registrationNumber
    ? `${COMPANY.legalName || COMPANY.brand} · Registration ${COMPANY.registrationNumber} · ${COMPANY.location}`
    : `${COMPANY.brand} · ${COMPANY.location}`;
  return `<footer class="site-footer studio-footer">
    <div class="footer-contact">
      <div><p class="eyebrow">A useful next step</p><h2>Let’s make it work.</h2><p>A website, an app or a better way to get things done.<br>Tell us what you have in mind.</p></div>
      <div class="footer-contact-actions"><a class="button button-primary" href="${whatsappLink("Hi EmberWeb, I would like to discuss a website, app or automation project.")}" target="_blank" rel="noopener noreferrer">Chat on WhatsApp <span aria-hidden="true">↗</span></a><a class="footer-phone" href="tel:+27723398781">${COMPANY.phone}</a></div>
    </div>
    <div class="footer-resources">
      <div class="footer-about"><a class="brand" href="/" aria-label="EmberWeb home"><img src="/brand/ember-mark.svg" alt="" width="38" height="38"><span>EMBERWEB</span></a><p>Websites, apps &amp; practical AI.<br>Built around your business.</p><span class="footer-location">South Africa</span></div>
      <nav class="footer-column" aria-label="Explore EmberWeb"><h3>Explore</h3><a href="/work">Solutions</a><a href="/portfolio">Our portfolio</a><a href="/ai-lab">AI Lab</a><a href="/industries">Industries</a><a href="/studio">Our studio</a></nav>
      <nav class="footer-column" aria-label="Work with EmberWeb"><h3>Work with us</h3><a href="/start">Start a project</a><a href="/packages">Pricing</a><a href="/process">How we work</a><a href="/book">Book a call</a><a href="/audit">Free audit</a><a href="/care">EmberCare</a></nav>
      <div class="footer-downloads"><h3>Take a closer look</h3><a class="download-link" href="/downloads/emberweb-welcome-pack.pdf" download><span><strong>Welcome pack</strong><small>Your first steps with EmberWeb · PDF</small></span><span aria-hidden="true">↓</span></a><a class="download-link" href="/downloads/emberweb-capabilities.pdf" download><span><strong>Capabilities &amp; projects</strong><small>What we build, with 12 examples · PDF</small></span><span aria-hidden="true">↓</span></a><p>No form. Download and share.</p></div>
    </div>
    <div class="footer-legal"><p>© ${new Date().getFullYear()} ${legal}</p><nav aria-label="Legal and account links"><a href="/policies">Privacy &amp; policies</a><a href="/login">Customer Login</a><a href="#main-content">Back to top ↑</a></nav></div>
  </footer>`;
}
