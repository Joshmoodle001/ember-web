"use client";

import { useEffect, useState } from "react";

const Arrow = () => <span aria-hidden="true">→</span>;

const services = [
  ["01", "Web experiences", "Strategy-led websites, online shops and custom platforms that feel unmistakably yours.", "/visuals/hands-strategy.png"],
  ["02", "Care that continues", "Hosting, performance, backups and human support after launch—not a handover and a hope.", "/visuals/founder-portrait.png"],
  ["03", "Systems that flow", "Useful automation and AI that takes repetitive work off your plate and keeps leads moving.", "/visuals/bubble-clay.png"],
];

const visualArchive = [
  ["hero-3d", "A cobalt and clay 3D sculpture"], ["founder-collab", "A founder and designer collaborating"],
  ["topographic-waves", "Blue and clay topographic waves"], ["hands-strategy", "Hands building a strategy"],
  ["pebble-3d", "Organic 3D pebble"], ["cafe-owner", "A local cafe owner"],
  ["kinetic-sheets", "Kinetic colour sheets"], ["partners", "Partners in conversation"],
  ["clay-pillar", "A clay and blue pillar"], ["team-table", "A team at work"],
  ["bubble-clay", "A vivid organic material study"], ["founder-portrait", "A local founder"],
  ["sphere-3d", "An iridescent 3D sphere"], ["barber-owner", "A business owner with a tablet"],
  ["ribbon-tunnel", "A moving ribbon tunnel"], ["tradeswoman", "A tradeswoman at work"],
  ["mobius-3d", "A clay and glass loop"], ["florist", "A florist at work"],
  ["clay-texture", "Organic clay texture"], ["next-chapter", "An entrepreneur moving forward"],
];

export default function Home() {
  const [step, setStep] = useState(0);
  const questions = [
    ["What would move your business forward?", "More enquiries & leads", "A stronger online presence", "Replacing an old website", "Launching something new"],
    ["When would you like to move?", "This month", "Within 4–6 weeks", "I’m exploring"],
  ];

  useEffect(() => {
    const update = () => {
      const progress = Math.min(1, window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight));
      document.documentElement.style.setProperty("--scroll", `${progress}`);
      document.documentElement.style.setProperty("--depth", `${Math.min(1, window.scrollY / 1000)}`);
    };
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible")),
      { threshold: 0.14 },
    );
    document.querySelectorAll("[data-reveal]").forEach((item) => observer.observe(item));
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener("scroll", update); };
  }, []);

  return (
    <main>
      <div className="progress" aria-hidden="true" />
      <section className="hero" id="top">
        <div className="hero-grain" aria-hidden="true" />
        <nav className="nav" aria-label="Main navigation">
          <a className="brand" href="#top" aria-label="EmberWeb home">EMBER<span>WEB</span></a>
          <div className="nav-links"><a href="/packages">Packages</a><a href="/audit">Free audits</a><a href="#method">Our approach</a></div>
          <a className="nav-cta" href="mailto:info@emberweb.co.za?subject=New%20EmberWeb%20project">Start a project <Arrow /></a>
        </nav>
        <div className="hero-copy" data-reveal>
          <p className="eyebrow"><i /> Independent digital studio · South Africa</p>
          <h1>Websites with<br /><em>real pull.</em></h1>
          <div className="hero-foot"><p>We turn good businesses into vivid digital experiences that get remembered, trusted and chosen.</p><a className="round-link" href="#story" aria-label="Explore the EmberWeb story"><Arrow /></a></div>
        </div>
        <div className="hero-art" aria-hidden="true"><img src="/visuals/hero-3d.png" alt="" /><span className="orb orb-one" /><span className="orb orb-two" /><b>EW</b></div>
        <p className="scroll-note">SCROLL INTO THE WORK <span>↓</span></p>
      </section>

      <section className="marquee" aria-label="EmberWeb capabilities"><div>WEB DESIGN <b>✦</b> DIGITAL PRODUCTS <b>✦</b> AI AUTOMATION <b>✦</b> HUMAN SUPPORT <b>✦</b> WEB DESIGN <b>✦</b> DIGITAL PRODUCTS <b>✦</b> AI AUTOMATION <b>✦</b> HUMAN SUPPORT <b>✦</b></div></section>

      <section className="manifesto" data-reveal>
        <p className="section-label">[ Digital, with a pulse ]</p>
        <h2>More character.<br />More <em>momentum.</em><br />More business.</h2>
        <p>Strong digital work is never decoration. It is a feeling, a clear route forward, and an experience people can trust in seconds.</p>
        <div className="manifesto-art" aria-hidden="true"><img src="/visuals/mobius-3d.png" alt="" /></div>
      </section>

      <section className="human-story" id="story" data-reveal>
        <div className="human-photo"><img src="/visuals/founder-collab.png" alt="A business owner and web designer working together" /><span>REAL PEOPLE / REAL PROGRESS</span></div>
        <div className="human-copy"><p className="section-label">[ Start human ]</p><h2>Good work begins with a <em>good conversation.</em></h2><p>We listen closely, ask the useful questions and build alongside founders who care about where their business is headed. No agency fog. No ticket maze.</p><a href="mailto:info@emberweb.co.za?subject=Let%27s%20talk">Meet your digital partner <Arrow /></a></div>
      </section>

      <section className="scroll-story" data-reveal>
        <div className="story-sticky"><p className="section-label">[ A scroll-led system ]</p><h2>Move from<br /><em>signal</em> to sale.</h2><p>Every interaction has a job: create curiosity, make the value clear, and give the next step a little more gravity.</p></div>
        <div className="story-panels">
          <article><img src="/visuals/ribbon-tunnel.png" alt="Abstract blue and orange ribbon forms" /><span>01 / ARRIVE</span><h3>Make the first second count.</h3></article>
          <article><img src="/visuals/topographic-waves.png" alt="Abstract blue and clay forms" /><span>02 / EXPLORE</span><h3>Let the story unfold, not dump.</h3></article>
          <article><img src="/visuals/kinetic-sheets.png" alt="Abstract kinetic colour forms" /><span>03 / ACT</span><h3>Give every visitor a clear way in.</h3></article>
        </div>
      </section>

      <section className="services" data-reveal>
        <div className="section-heading"><p className="section-label">[ What we build ]</p><p>A small, senior team for the digital moments that can change the direction of your business.</p></div>
        <div className="service-list">{services.map(([number, title, text, image]) => <article className="service" key={number}><div className="service-index">{number}</div><div className="service-text"><h3>{title}</h3><p>{text}</p><a href="mailto:info@emberweb.co.za?subject=I%27m%20interested%20in%20EmberWeb">Explore this <Arrow /></a></div><img src={image} alt="" loading="lazy" /></article>)}</div>
      </section>

      <section className="method" id="method" data-reveal>
        <div className="method-visual"><img src="/visuals/clay-pillar.png" alt="" /><p>GOOD WORK<br />STARTS WITH<br /><em>GOOD QUESTIONS.</em></p></div>
        <div className="method-copy"><p className="section-label">[ The Ember method ]</p><h2>Clarity first.<br /><em>Everything else</em><br />follows.</h2><p>Before we open a design tool, we get close to the opportunity. That gives the build a purpose, the design a point of view, and the launch a better chance of working.</p><ol><li><span>01</span> Find the signal</li><li><span>02</span> Shape the experience</li><li><span>03</span> Build for the real world</li></ol></div>
      </section>

      <section className="visual-vault" data-reveal>
        <div className="vault-intro"><p className="section-label">[ A visual vocabulary ]</p><h2>Every element<br />has <em>energy.</em></h2><p>Twenty original visual studies—made for EmberWeb—give the experience texture, humanity and an unmistakable point of view.</p></div>
        <div className="vault-grid">{visualArchive.map(([name, alt], index) => <figure className={`vault-tile tile-${(index % 6) + 1}`} key={name}><img src={`/visuals/${name}.png`} alt={alt} loading="lazy" /><figcaption>{String(index + 1).padStart(2, "0")} / EMBER VISUAL STUDY</figcaption></figure>)}</div>
      </section>

      <section className="qualifier" data-reveal>
        <p className="section-label">[ Find your launch path ]</p><div><span>0{Math.min(step + 1, 3)} / 03</span><h2>{step < 2 ? questions[step][0] : "Ready to make it real?"}</h2>{step < 2 ? <div className="answers">{questions[step].slice(1).map((answer) => <button key={answer} onClick={() => setStep(step + 1)}>{answer} <Arrow /></button>)}</div> : <div className="answers"><a href="mailto:info@emberweb.co.za?subject=Book%20a%20free%20meeting">Book a free meeting <Arrow /></a><a href="mailto:info@emberweb.co.za?subject=I%20have%20a%20few%20questions">I have a few questions <Arrow /></a></div>}</div><p>No signup needed. Just a useful first conversation about what is possible.</p>
      </section>

      <section className="trust" data-reveal><div><p className="section-label">[ Made to stay ]</p><h2>A site that feels like a <em>safe pair of hands.</em></h2></div><div className="trust-grid"><article><b>01</b><h3>We stay after launch</h3><p>Hosting, updates, backups and someone to call when you need help.</p></article><article><b>02</b><h3>Your business stays yours</h3><p>Your domain is yours. Your content is portable. No mystery handover.</p></article><article><b>03</b><h3>Made for local action</h3><p>Fast mobile journeys, WhatsApp, maps and obvious ways to enquire.</p></article><a className="whatsapp" href="https://wa.me/27825106642">Talk to us on WhatsApp <Arrow /></a></div></section>

      <section className="closing" data-reveal><img src="/visuals/next-chapter.png" alt="An entrepreneur walking toward their next chapter" /><div><p className="section-label">[ Your next chapter ]</p><h2>Let&apos;s make<br />something <em>unmissable.</em></h2><a className="closing-cta" href="mailto:info@emberweb.co.za?subject=New%20EmberWeb%20project">Tell us where you&apos;re going <Arrow /></a></div></section>
      <footer><a className="brand" href="#top">EMBER<span>WEB</span></a><p>© {new Date().getFullYear()} EmberWeb. Crafted with intent.</p><a href="mailto:info@emberweb.co.za">info@emberweb.co.za</a></footer>
    </main>
  );
}
