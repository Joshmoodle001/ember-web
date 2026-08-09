const Arrow = () => <span aria-hidden="true">↗</span>;

const services = [
  {
    number: "01",
    title: "Web experiences",
    text: "Done-for-you websites: strategy, design, build, hosting and ongoing support in one focused team.",
    tags: ["Web design", "E-commerce", "Web apps"],
  },
  {
    number: "02",
    title: "Always-on care",
    text: "Hosting, SSL, backups, updates, monitoring and human support—handled after launch, not forgotten after invoice.",
    tags: ["Hosting", "Maintenance", "Support"],
  },
  {
    number: "03",
    title: "Automation systems",
    text: "Practical automation and AI systems that remove repetitive work and make follow-up faster.",
    tags: ["AI readiness", "Automation", "Consulting"],
  },
];

export default function Home() {
  return (
    <main>
      <section className="hero" id="top">
        <nav className="nav" aria-label="Main navigation">
          <a className="brand" href="#top" aria-label="EmberWeb home">EMBER<span>WEB</span></a>
          <div className="nav-links">
            <a href="#services">What we do</a>
            <a href="#approach">Our approach</a>
          </div>
          <a className="nav-cta" href="mailto:hello@emberweb.co.za?subject=Let's%20build%20something%20better">Start a project <Arrow /></a>
        </nav>

        <div className="hero-copy">
          <p className="eyebrow"><i /> Independent digital studio · South Africa</p>
          <h1>Make your next<br />move <em>matter.</em></h1>
          <div className="hero-foot">
            <p>We design intelligent websites, applications, and automations for businesses ready to grow with intent.</p>
            <a className="round-link" href="mailto:hello@emberweb.co.za?subject=Let's%20build%20something%20better" aria-label="Start a project"><Arrow /></a>
          </div>
        </div>
        <div className="hero-orbit" aria-hidden="true"><span /><span /><span /><b>EW</b></div>
        <p className="scroll">SCROLL TO EXPLORE <span>↓</span></p>
      </section>

      <section className="marquee"><div>WEB DESIGN <b>✦</b> HOSTING <b>✦</b> AI AUTOMATION <b>✦</b> BUSINESS SYSTEMS <b>✦</b> WEB DESIGN <b>✦</b> HOSTING <b>✦</b> AI AUTOMATION <b>✦</b> BUSINESS SYSTEMS <b>✦</b></div></section>

      <section className="statement">
        <p className="section-label">[ Built for momentum ]</p>
        <h2>Not another digital<br />agency. A <em>growth partner</em><br />with taste and teeth.</h2>
        <p className="statement-note">EmberWeb combines clear thinking, considered craft, and smart technology to build digital experiences people choose to use.</p>
      </section>

      <section className="services" id="services">
        <div className="section-heading">
          <p className="section-label">[ How we help ]</p>
          <p>One focused team for the moments that can change the direction of your business.</p>
        </div>
        <div className="service-list">
          {services.map((service) => (
            <article className="service" key={service.number}>
              <p className="service-number">{service.number}</p>
              <div><h3>{service.title}</h3><p>{service.text}</p></div>
              <div className="service-meta"><div>{service.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><a href="mailto:hello@emberweb.co.za?subject=I%27m%20interested%20in%20your%20services" aria-label={`Learn about ${service.title}`}><Arrow /></a></div>
            </article>
          ))}
        </div>
      </section>

      <section className="approach" id="approach">
        <div className="approach-visual"><p>GOOD WORK<br />STARTS WITH<br /><em>GOOD QUESTIONS.</em></p><div className="grid-mark" /></div>
        <div className="approach-copy"><p className="section-label">[ The Ember method ]</p><h2>Clarity first.<br /><em>Everything else</em><br />follows.</h2><p>We get close to the problem before we open a design tool. That means fewer assumptions, stronger decisions, and work that earns its place in your business.</p><ol><li><span>01</span> Find the signal</li><li><span>02</span> Shape the solution</li><li><span>03</span> Build for the real world</li></ol></div>
      </section>

      <section className="showcase"><div className="showcase-intro"><p className="section-label">[ Proof in the process ]</p><h2>Designed to make<br/>your next client <em>stop scrolling.</em></h2><p>EmberWeb is the kind of experience we build for our clients: clear on a phone, memorable in a pitch, and alive in the details.</p></div><div className="artifact"><img src="/ember-artifact.png" alt="Abstract EmberWeb digital artwork"/><div className="artifact-copy"><span>01 / VISUAL SYSTEM</span><strong>Motion with a reason</strong><p>Layered imagery, considered type, and responsive interactions—made to signal quality before a word is read.</p></div></div><div className="outcomes"><article><span>01</span><h3>Choose a pace</h3><p>Need to launch this month? Prefer a considered 4–6 week build? We shape the work around the opportunity.</p></article><article><span>02</span><h3>Keep it simple</h3><p>One team manages the work from first idea to updates, support, and the systems behind it.</p></article><article><span>03</span><h3>Pay when ready</h3><p>We scope together first. Payment links come only once you’re happy with the way forward.</p></article></div></section>

      <section className="closing">
        <p className="section-label">[ Your next chapter ]</p>
        <h2>Let&apos;s make<br />something <em>unmissable.</em></h2>
        <a className="closing-cta" href="mailto:hello@emberweb.co.za?subject=Let's%20build%20something%20better">Tell us where you&apos;re going <Arrow /></a>
      </section>

      <footer><a className="brand" href="#top">EMBER<span>WEB</span></a><p>© {new Date().getFullYear()} EmberWeb. Crafted with intent.</p><a href="mailto:hello@emberweb.co.za">hello@emberweb.co.za</a></footer>
    </main>
  );
}
