const audits = [
  ["01", "Website audit", "See what your website is saying before you do.", "We review clarity, mobile experience, speed, trust, enquiries and the gaps between a visit and a lead.", ["What is confusing visitors", "Where mobile experience breaks", "What to fix first"], "Free Website Audit"],
  ["02", "AI + automation audit", "Spot the repetitive work your team should not be doing.", "We look at follow-ups, handovers, admin and customer journeys to find sensible automation opportunities.", ["Where time disappears", "Which tasks can be streamlined", "A practical next-step plan"], "Free AI Audit"],
];

export default function Audit() {
  return <main className="subpage audit-page">
    <nav className="sub-nav"><a className="brand" href="/">EMBER<span>WEB</span></a><a className="sub-nav-cta" href="mailto:info@emberweb.co.za?subject=Book%20a%20free%20meeting">Book a free meeting →</a></nav>
    <header className="sub-hero"><p className="section-label">[ Free audits ]</p><h1>Find what&apos;s holding<br />your website <em>back.</em></h1><div className="sub-hero-foot"><strong>Clear, useful, no-pressure advice.</strong><p>Choose an audit and we&apos;ll identify practical opportunities to make your digital presence work harder.</p></div></header>
    <section className="audit-section"><div className="package-section-head"><p className="section-label">[ Choose your focus ]</p><p>Start with the area that feels most stuck. We&apos;ll keep the findings useful, plain-spoken and connected to action.</p></div><div className="audit-choice-grid">{audits.map(([number, name, title, description, outcomes, subject]) => <article className="audit-choice" key={name}><span>{number} / {name.toUpperCase()}</span><h2>{title}</h2><p>{description}</p><ul>{outcomes.map((outcome) => <li key={outcome}>→ {outcome}</li>)}</ul><a href={`mailto:info@emberweb.co.za?subject=${encodeURIComponent(subject)}`}>Request this audit <span>→</span></a></article>)}</div></section>
    <section className="audit-how"><p className="section-label">[ What happens next ]</p><div className="audit-steps"><article><span>01</span><h3>Send the link</h3><p>Tell us what you would like looked at.</p></article><article><span>02</span><h3>We look closely</h3><p>We review the journey, not just surface-level details.</p></article><article><span>03</span><h3>You get clarity</h3><p>We share practical next steps—without the hard sell.</p></article></div></section>
  </main>;
}
