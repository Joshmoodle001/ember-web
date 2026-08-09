"use client";

import { FormEvent, useState } from "react";

const audits = [
  ["01", "Website audit", "See what your website is saying before you do.", "We review clarity, mobile experience, speed, trust, enquiries and the gaps between a visit and a lead.", ["What is confusing visitors", "Where mobile experience breaks", "What to fix first"]],
  ["02", "AI + automation audit", "Spot the repetitive work your team should not be doing.", "We look at follow-ups, handovers, admin and customer journeys to find sensible automation opportunities.", ["Where time disappears", "Which tasks can be streamlined", "A practical next-step plan"]],
];

export default function Audit() {
  const [focus, setFocus] = useState(audits[0][1]);
  const submitAudit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const details = [`Audit: ${form.get("focus")}`, `Name: ${form.get("name")}`, `Business: ${form.get("business")}`, `Website: ${form.get("website")}`, `Email: ${form.get("email")}`, `What would help: ${form.get("notes") || "Not specified"}`].join("\n");
    window.location.href = `mailto:info@emberweb.co.za?subject=${encodeURIComponent(`EmberWeb ${form.get("focus")} request`)}&body=${encodeURIComponent(details)}`;
  };

  return <main className="subpage audit-page">
    <nav className="sub-nav"><a className="brand" href="/">EMBER<span>WEB</span></a><a className="sub-nav-cta" href="/start">Start a project →</a></nav>
    <header className="sub-hero"><p className="section-label">[ Free audits ]</p><h1>Find what&apos;s holding<br />your website <em>back.</em></h1><div className="sub-hero-foot"><strong>Clear, useful, no-pressure advice.</strong><p>Choose an audit and we&apos;ll identify practical opportunities to make your digital presence work harder.</p></div></header>
    <section className="audit-section"><div className="package-section-head"><p className="section-label">[ Choose your focus ]</p><p>Start with the area that feels most stuck. We&apos;ll keep the findings useful, plain-spoken and connected to action.</p></div><div className="audit-choice-grid">{audits.map(([number, name, title, description, outcomes]) => <article className="audit-choice" key={name}><span>{number} / {name.toUpperCase()}</span><h2>{title}</h2><p>{description}</p><ul>{outcomes.map((outcome) => <li key={outcome}>→ {outcome}</li>)}</ul><button type="button" onClick={() => setFocus(name)}>Choose this audit <span>→</span></button></article>)}</div></section>
    <section className="form-section audit-form-section" id="request"><div><p className="section-label">[ Send the link ]</p><h2>Get a useful answer,<br /><em>not a sales pitch.</em></h2><p>Share the basics below. Your request opens in your email app so you stay in control of what is sent.</p></div><form onSubmit={submitAudit}><label>Audit focus<select name="focus" value={focus} onChange={(event) => setFocus(event.target.value)}>{audits.map(([, name]) => <option key={name}>{name}</option>)}</select></label><label>Your name<input name="name" required autoComplete="name" /></label><label>Business name<input name="business" required autoComplete="organization" /></label><label>Website link<input name="website" type="url" placeholder="https://" required /></label><label>Email address<input name="email" type="email" required autoComplete="email" /></label><label className="form-full">What would you most like to improve?<textarea name="notes" rows={4} /></label><button className="form-submit" type="submit">Request my free audit <span>→</span></button></form></section>
    <section className="audit-how"><p className="section-label">[ What happens next ]</p><div className="audit-steps"><article><span>01</span><h3>Send the link</h3><p>Tell us what you would like looked at.</p></article><article><span>02</span><h3>We look closely</h3><p>We review the journey, not just surface-level details.</p></article><article><span>03</span><h3>You get clarity</h3><p>We share practical next steps—without the hard sell.</p></article></div></section>
  </main>;
}
