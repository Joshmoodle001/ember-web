"use client";

import { FormEvent, useState } from "react";

export default function Start() {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setStatus("sending");
    const form = event.currentTarget; const data = Object.fromEntries(new FormData(form));
    const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, kind: "project" }) });
    if (response.ok) { form.reset(); setStatus("success"); } else setStatus("error");
  };
  return <main id="main-content" className="subpage form-page"><nav className="sub-nav"><a className="brand" href="/">EMBER<span>WEB</span></a></nav><header className="sub-hero"><p className="section-label">[ Start a project ]</p><h1>Tell us what<br />you&apos;re <em>building.</em></h1><div className="sub-hero-foot"><strong>Two minutes. No sales maze.</strong><p>We&apos;ll reply with the right starting point, an indicative timeline and any questions worth asking.</p></div></header><section className="form-section"><form onSubmit={submit}><input className="honeypot" name="company" tabIndex={-1} autoComplete="off" /><label>Name<input name="name" required /></label><label>Business name<input name="business" required /></label><label>Email<input name="email" type="email" required /></label><label>Phone / WhatsApp<input name="phone" /></label><label>What do you need?<select name="need"><option>New website</option><option>Website redesign</option><option>Online shop / bookings</option><option>Automation or AI support</option><option>Not sure yet</option></select></label><label>When do you want to launch?<select name="timing"><option>This month</option><option>Within 4–6 weeks</option><option>I&apos;m exploring</option></select></label><label className="wide">Anything else we should know?<textarea name="notes" rows={5} placeholder="What is working, what is not, and where you would like to get to." /></label><button type="submit" disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Send my brief →"}</button><p className={`form-note form-status ${status}`} aria-live="polite">{status === "success" ? "Received — please check your inbox for confirmation." : status === "error" ? "That did not send. Please try again or WhatsApp us." : "We send this securely to EmberWeb and email you a confirmation. We do not add you to a marketing list."}</p></form></section></main>;
}
