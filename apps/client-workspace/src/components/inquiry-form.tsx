"use client";

import { FormEvent, useRef, useState } from "react";

type IntakeResponse = { success?: boolean; bookingUrl?: string | null; error?: string };

export default function InquiryForm() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [bookingUrl, setBookingUrl] = useState<string | null>(null);
  const submissionId = useRef<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setPending(true);
    setError(false);
    setMessage("");
    setBookingUrl(null);
    submissionId.current ??= crypto.randomUUID();

    try {
      const response = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(formData.entries()),
          submission_id: submissionId.current,
        }),
      });
      const result = (await response.json()) as IntakeResponse;
      if (!response.ok) throw new Error(result.error || "Could not submit your brief.");
      submissionId.current = null;
      form.reset();
      setBookingUrl(result.bookingUrl ?? null);
      setMessage("Thanks — your brief is in. We’ll follow up about the next step.");
    } catch (submitError) {
      setError(true);
      setMessage(submitError instanceof Error ? submitError.message : "Could not submit your brief. Try again shortly.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <fieldset className="form-fields" disabled={pending || Boolean(message && !error)}>
      <label className="field" htmlFor="name">Your name<input id="name" name="name" autoComplete="name" required minLength={2} maxLength={120} /></label>
      <label className="field" htmlFor="company">Company or organisation<input id="company" name="company" autoComplete="organization" maxLength={160} /></label>
      <label className="field" htmlFor="email">Email address<input id="email" name="email" type="email" autoComplete="email" required maxLength={254} /></label>
      <label className="field" htmlFor="phone">Phone number <span className="muted">(optional)</span><input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={40} /></label>
      <label className="field" htmlFor="service">What would you like help with?
        <select id="service" name="service" required defaultValue="">
          <option value="" disabled>Select a service</option>
          <option value="web_design">Website design or development</option>
          <option value="ai_development">AI development or automation</option>
          <option value="web_and_ai">Website and AI project</option>
          <option value="other">Something else</option>
        </select>
      </label>
      <label className="field" htmlFor="budget">Estimated budget <span className="muted">(optional)</span>
        <select id="budget" name="budget" defaultValue="">
          <option value="">Not sure yet</option>
          <option value="under_10000">Under R10,000</option>
          <option value="10000_30000">R10,000–R30,000</option>
          <option value="30000_75000">R30,000–R75,000</option>
          <option value="75000_plus">R75,000+</option>
          <option value="not_sure">I’d like guidance</option>
        </select>
      </label>
      <label className="field" htmlFor="brief">A little about the project<textarea id="brief" name="brief" required minLength={20} maxLength={5000} placeholder="What are you hoping to improve or build?" /></label>
      <label className="honeypot" aria-hidden="true" htmlFor="website">Leave this field empty<input id="website" name="website" tabIndex={-1} autoComplete="off" /></label>
      <label className="checkline"><input type="checkbox" required /> I agree that EmberWeb may contact me about this enquiry.</label>
      <button className="button button-primary" type="submit" disabled={pending}>{pending ? "Sending brief…" : "Send project brief"}<span aria-hidden="true">→</span></button>
      </fieldset>
      <p className={`form-message${error ? " error" : message ? " success" : ""}`} aria-live="polite">{message}</p>
      {message && !error && <div className="booking-callout"><p>Your brief has been saved. Next, choose a time for a discovery call so we can agree on the scope and the best way forward.</p><a className="button button-primary" href={bookingUrl || "https://emberweb.co.za/book"} target="_blank" rel="noopener noreferrer">Choose a discovery time <span aria-hidden="true">↗</span></a></div>}
    </form>
  );
}
