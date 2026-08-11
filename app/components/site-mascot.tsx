"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

const prompts: Record<string, string> = {
  "/": "Need a hand choosing your next move?",
  "/packages": "Want help finding the right starting point?",
  "/audit": "Send a link and we will look closely.",
  "/process": "A clear route makes good work easier.",
  "/work": "Want to see what could fit your business?",
  "/industries": "Let’s shape this around your customers.",
  "/care": "Good websites deserve ongoing care.",
  "/start": "Ready when you are.",
};

export function SiteMascot() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const prompt = prompts[pathname] ?? "Let’s find the next useful step.";

  return <aside className={`ember-guide ${open ? "is-open" : ""}`} aria-label="EmberGuide, your site helper">
    <div className="ember-guide-panel" aria-live="polite">
      <p><span>EMBERGUIDE</span>{prompt}</p>
      <div>
        <a href="/start">Start a project <b aria-hidden="true">→</b></a>
        <a href="https://wa.me/27825106642?text=Hi%20EmberWeb%2C%20I%27d%20like%20to%20chat%20about%20a%20website" target="_blank" rel="noreferrer">WhatsApp us <b aria-hidden="true">→</b></a>
      </div>
    </div>
    <button type="button" className="ember-guide-button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? "Close EmberGuide" : "Open EmberGuide"}>
      <span className="ember-guide-spark" aria-hidden="true" />
      <img src="/brand/ember-guide.png" alt="" />
      <i aria-hidden="true">{open ? "×" : "?"}</i>
    </button>
  </aside>;
}
