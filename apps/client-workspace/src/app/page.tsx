import Link from "next/link";

export default function HomePage() {
  return (
    <main className="shell landing">
      <header className="topbar">
        <a className="brand" href="https://emberweb.co.za/">EMBER<span>WEB</span></a>
        <nav className="hero-actions" aria-label="Account access"><Link className="quiet-link" href="/account">Client login</Link><Link className="quiet-link" href="/login">Team login <span aria-hidden="true">↗</span></Link></nav>
      </header>
      <section className="hero-card">
        <p className="eyebrow">YOUR NEXT STEP WITH EMBERWEB</p>
        <h1>One clear path from first conversation to launch.</h1>
        <p className="hero-copy">Share your goal, choose a discovery time, and agree the scope before the build begins. Clients can follow their projects, websites, apps and published features from their own private dashboard. Proposals and payment links are also shared directly.</p>
        <div className="hero-actions">
          <a className="button button-primary" href="https://emberweb.co.za/start">Start a project <span aria-hidden="true">→</span></a>
          <a className="button button-quiet" href="https://emberweb.co.za/book">Book a discovery call</a>
        </div>
        <div className="process-strip" aria-label="Project steps">
          <span><b>01</b> Brief</span><i aria-hidden="true" />
          <span><b>02</b> Discovery</span><i aria-hidden="true" />
          <span><b>03</b> Proposal</span><i aria-hidden="true" />
          <span><b>04</b> Payment</span><i aria-hidden="true" />
          <span><b>05</b> Delivery</span>
        </div>
      </section>
      <footer className="footer-note">Already have a proposal or invoice? Open the private link shared by EmberWeb. Client login opens your own dashboard. Team login is for the EmberWeb team.</footer>
    </main>
  );
}
