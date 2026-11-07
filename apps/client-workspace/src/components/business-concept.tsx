"use client";

import { useState } from "react";
import { getIndustry } from "@/lib/outreach";

export default function BusinessConcept({ business = "Your next chapter", industry = "general" }: { business?: string; industry?: string }) {
  const [view, setView] = useState<"website" | "assistant" | "dashboard">("website");
  const profile = getIndustry(industry);
  return <section className="concept-preview" aria-label="Illustrative business concept">
    <div className="concept-toolbar"><span>ILLUSTRATIVE CONCEPT · NOT A LIVE CLIENT SYSTEM</span><div role="group" aria-label="Preview view">{(["website", "assistant", "dashboard"] as const).map((item) => <button key={item} type="button" aria-pressed={view === item} onClick={() => setView(item)}>{item}</button>)}</div></div>
    <div className="concept-browser"><span>● ● ●</span><strong>{business}</strong><span>CONCEPT</span></div>
    {view === "website" ? <div className="concept-canvas"><p className="eyebrow">BUILT AROUND YOUR CUSTOMERS</p><h2>{profile.headline}</h2><p>A focused digital experience for {business}: clear information, a useful next action, and a team ready to help.</p><button type="button" onClick={() => setView("assistant")}>Try the sample enquiry →</button><div className="concept-features">{profile.features.map((feature, index) => <article key={feature}><span>0{index + 1}</span><h3>{feature}</h3></article>)}</div></div>
      : view === "assistant" ? <div className="concept-canvas"><p className="eyebrow">SAMPLE CONVERSATION</p><h2>Make the first question easier.</h2><div className="demo-chat"><p className="demo-customer">I’d like to know what’s available and what happens next.</p><p className="demo-assistant">I can help you find the right service and prepare an enquiry for the team. A person will confirm availability and pricing.</p><p className="demo-customer">Can I speak to someone?</p><p className="demo-assistant">Of course. Choose an available discovery time. Google Calendar sends the invitation and confirmation email.</p></div><button type="button" onClick={() => setView("dashboard")}>See the owner’s view →</button><p className="micro-note">Scripted example. No message is sent and no appointment is created.</p></div>
        : <div className="concept-canvas"><p className="eyebrow">SAMPLE OWNER DASHBOARD</p><h2>Know what needs your attention.</h2><div className="concept-features"><article><span>NEW ENQUIRY</span><h3>Request ready for review</h3><p>Customer needs and next action in one place.</p></article><article><span>APPOINTMENT</span><h3>Confirmation by email</h3><p>Calendar invitation after a real booking.</p></article><article><span>YOUR TEAM</span><h3>Human review</h3><p>Approve advice, quotes and follow-ups.</p></article></div><p className="micro-note">Sample states only. Features and integrations are scoped after discovery.</p><button type="button" onClick={() => setView("website")}>Back to website preview</button></div>}
  </section>;
}
