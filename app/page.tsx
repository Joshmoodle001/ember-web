const Arrow = () => <span aria-hidden="true">↗</span>;

const services = [
  {
    number: "01",
    title: "Web experiences",
    text: "Distinctive, fast websites that turn the right attention into real enquiries.",
    tags: ["Strategy", "Design", "Development"],
  },
  {
    number: "02",
    title: "Useful software",
    text: "Purpose-built apps and client portals that make the complicated feel obvious.",
    tags: ["Web apps", "Portals", "Integrations"],
  },
  {
    number: "03",
    title: "Automation systems",
    text: "AI-powered workflows that reclaim time, sharpen follow-up, and keep business moving.",
    tags: ["AI", "Operations", "Growth"],
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

      <section className="closing">
        <p className="section-label">[ Your next chapter ]</p>
        <h2>Let&apos;s make<br />something <em>unmissable.</em></h2>
        <a className="closing-cta" href="mailto:hello@emberweb.co.za?subject=Let's%20build%20something%20better">Tell us where you&apos;re going <Arrow /></a>
      </section>

      <footer><a className="brand" href="#top">EMBER<span>WEB</span></a><p>© {new Date().getFullYear()} EmberWeb. Crafted with intent.</p><a href="mailto:hello@emberweb.co.za">hello@emberweb.co.za</a></footer>
    </main>
  );
}
