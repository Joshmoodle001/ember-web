"use client";

import { FormEvent, useState } from "react";

export default function Start() {
  const [ready, setReady] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message = [
      "Hi EmberWeb, I would like to start a project.",
      "",
      `Name: ${form.get("name")}`,
      `Business: ${form.get("business")}`,
      `Email: ${form.get("email")}`,
      `Phone: ${form.get("phone") || "Not provided"}`,
      `What I need: ${form.get("need")}`,
      `Launch timing: ${form.get("timing")}`,
      `Notes: ${form.get("notes") || "Not provided"}`,
    ].join("\n");
    window.open(`https://wa.me/27825106642?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    setReady(true);
  };

  return <main className="subpage form-page"><nav className="sub-nav"><a className="brand" href="/">EMBER<span>WEB</span></a><a className="sub-nav-cta" href="https://wa.me/27825106642?text=Hi%20EmberWeb%2C%20I%27d%20like%20to%20book%20a%20meeting">WhatsApp us →</a></nav><header className="sub-hero"><p className="section-label">[ Start a project ]</p><h1>Tell us what<br/>you&apos;re <em>building.</em></h1><div className="sub-hero-foot"><strong>Two minutes. No sales maze.</strong><p>We&apos;ll reply with the right starting point, an indicative timeline and any questions worth asking.</p></div></header><section className="form-section"><form onSubmit={submit}><label>Name<input name="name" required autoComplete="name" /></label><label>Business name<input name="business" required autoComplete="organization" /></label><label>Email<input name="email" type="email" required autoComplete="email" /></label><label>Phone / WhatsApp<input name="phone" autoComplete="tel" /></label><label>What do you need?<select name="need"><option>New website</option><option>Website redesign</option><option>Online shop / bookings</option><option>Automation or AI support</option><option>Not sure yet</option></select></label><label>When do you want to launch?<select name="timing"><option>This month</option><option>Within 4–6 weeks</option><option>I&apos;m exploring</option></select></label><label className="wide">Anything else we should know?<textarea name="notes" rows={5} placeholder="What is working, what is not, and where you would like to get to." /></label><button type="submit">Continue on WhatsApp →</button><p className="form-note">Your brief opens in WhatsApp with every detail ready to send. Prefer email? <a href="mailto:info@emberweb.co.za?subject=New%20EmberWeb%20project%20brief">Email EmberWeb</a>.</p>{ready && <p className="form-success" role="status"><strong>Your brief is ready in WhatsApp.</strong> Send the message there and EmberWeb will take it from here.</p>}</form></section></main>;
}
