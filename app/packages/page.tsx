const packages = [
  ["01", "Launch Lite", "A smart, credible first presence.", "A focused, mobile-first website with the essentials to get found and start building trust.", "Best for new businesses", ["Mobile-first website", "Managed hosting + SSL", "Backups + support"]],
  ["02", "Starter", "Turn attention into leads.", "A fuller content experience with local SEO foundations, enquiry paths and ongoing care.", "Best for service businesses", ["Everything in Launch Lite", "Lead-focused pages", "Google-ready foundations"]],
  ["03", "Business", "Make the site part of the operation.", "More pages, deeper conversion journeys, integrations and a stronger growth foundation.", "Best for established teams", ["Everything in Starter", "Conversion journeys", "Integrations + support"]],
  ["04", "Growth", "Build beyond a brochure site.", "A tailored digital system: web app, automation, dashboard or customer experience.", "Best for ambitious teams", ["Custom digital system", "Automation planning", "Built around your workflow"]],
];

export default function Packages() {
  return <main className="subpage package-page">
    <nav className="sub-nav"><a className="brand" href="/">EMBER<span>WEB</span></a><a className="sub-nav-cta" href="mailto:info@emberweb.co.za?subject=Book%20a%20free%20meeting">Book a free meeting →</a></nav>
    <header className="sub-hero"><p className="section-label">[ Website packages ]</p><h1>Built to fit where<br />your business is <em>going.</em></h1><div className="sub-hero-foot"><strong>From R499 setup + R299/month</strong><p>Designed, hosted, protected and supported by EmberWeb—not handed over and forgotten.</p></div></header>
    <section className="package-section" aria-label="Website packages"><div className="package-section-head"><p className="section-label">[ Pick your starting point ]</p><p>Every project starts with a conversation, so we can make sure the package matches the opportunity—not just a checklist.</p></div><div className="package-grid">{packages.map(([number, name, promise, description, bestFor, features]) => <article className="package-card" key={name}><div className="package-card-top"><span>{number}</span><small>{bestFor}</small></div><h2>{name}</h2><b>{promise}</b><p>{description}</p><ul>{features.map((feature) => <li key={feature}>{feature}</li>)}</ul><a href={`mailto:info@emberweb.co.za?subject=${encodeURIComponent(`I’m interested in ${name}`)}`}>Talk about {name} <span>→</span></a></article>)}</div></section>
    <section className="sub-process"><p className="section-label">[ No pressure. Just clarity. ]</p><div><h2>Not sure which<br />one <em>fits?</em></h2><ol><li><span>01</span> Tell us where you are now</li><li><span>02</span> We map the right next move</li><li><span>03</span> You decide when it feels right</li></ol></div><a href="mailto:info@emberweb.co.za?subject=Help%20me%20choose%20a%20package">Help me choose <span>→</span></a></section>
  </main>;
}
