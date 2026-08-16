"use client";

import { useMemo, useState } from "react";

type Step = "welcome" | "service" | "slot" | "details" | "verify" | "confirmed" | "manage" | "reception";
type AppointmentStatus = "confirmed" | "arrived" | "in consultation" | "completed" | "cancelled";

const slots = ["08:30", "09:15", "10:00", "11:30", "14:00", "15:15"];
const queue = [
  { initials: "TM", name: "T. Mokoena", time: "08:30", status: "in consultation" },
  { initials: "NL", name: "N. Lewis", time: "09:00", status: "arrived" },
  { initials: "AK", name: "A. Khan", time: "09:15", status: "confirmed" },
];

export function PatientFrontDoorDemo() {
  const [step, setStep] = useState<Step>("welcome");
  const [service, setService] = useState("General consultation · 30 min");
  const [slot, setSlot] = useState("10:00");
  const [status, setStatus] = useState<AppointmentStatus>("confirmed");
  const [name, setName] = useState("Alex Taylor");
  const [notice, setNotice] = useState("");
  const queueLabel = status === "arrived" ? "You are next after the patient currently in consultation." : "Check in when you arrive to see your live place in the queue.";
  const statusClass = status.replaceAll(" ", "-");
  const today = useMemo(() => new Intl.DateTimeFormat("en-ZA", { weekday: "long", day: "numeric", month: "long" }).format(new Date(2026, 7, 18)), []);

  const reset = () => { setStep("welcome"); setStatus("confirmed"); setNotice(""); };
  const completeBooking = () => { setStatus("confirmed"); setStep("confirmed"); };

  return <main className="health-demo" id="main-content">
    <header className="health-topbar">
      <a className="health-demo-brand" href="/"><span>EW</span> EmberWeb <b>Patient Front Door</b></a>
      <div><span className="demo-live"><i /> Interactive demo</span><button type="button" onClick={() => setStep("reception")}>Practice workspace →</button></div>
    </header>

    <section className="health-demo-intro">
      <div><p className="eyebrow"><i /> A real product example</p><h1>Your practice.<br /><em>Always open.</em></h1><p>This is a working, fictional demo of the no-download patient experience EmberWeb can build for a medical practice.</p></div>
      <div className="health-demo-metrics"><span>Patient booking</span><strong>under 90 sec</strong><span>Clinical data stored</span><strong>none in this demo</strong></div>
    </section>

    <section className="health-app-frame" aria-label="Patient booking demo">
      <aside className="health-phone-brand"><span className="practice-mark">HC</span><div><b>Harbour Care</b><small>Family practice · Cape Town</small></div><button type="button" onClick={() => setStep("reception")}>Staff view</button></aside>
      <div className="health-phone">
        <div className="health-phone-status"><span>9:41</span><b>● ● ●</b></div>
        {step === "welcome" && <section className="patient-screen patient-welcome"><p className="patient-kicker">Welcome to</p><h2>Harbour<br /><em>Care.</em></h2><p>Friendly family healthcare, with appointments that fit into real life.</p><div className="practice-location"><span>⌖</span><div><b>Sea Point Medical Centre</b><small>12 Main Road · Cape Town</small></div></div><button className="patient-primary" type="button" onClick={() => setStep("service")}>Book an appointment <b>→</b></button><button className="patient-text" type="button" onClick={() => setStep("manage")}>Manage an existing appointment</button><small className="patient-emergency">For a medical emergency, call 112 or go to your nearest emergency department.</small></section>}
        {step === "service" && <section className="patient-screen"><button className="patient-back" onClick={() => setStep("welcome")}>← Back</button><p className="patient-kicker">Step 1 of 3</p><h2>What can we help <em>with?</em></h2><p className="patient-copy">Choose the appointment that best fits today. You will not need to create an account.</p><div className="service-options">{["General consultation · 30 min", "Follow-up consultation · 15 min", "Child wellness visit · 30 min"].map((item) => <button key={item} className={service === item ? "selected" : ""} type="button" onClick={() => setService(item)}><span>{item.split(" · ")[0]}</span><small>{item.split(" · ")[1]}</small><b>›</b></button>)}</div><button className="patient-primary" type="button" onClick={() => setStep("slot")}>Choose a time <b>→</b></button></section>}
        {step === "slot" && <section className="patient-screen"><button className="patient-back" onClick={() => setStep("service")}>← Back</button><p className="patient-kicker">Step 2 of 3</p><h2>Choose a <em>time.</em></h2><div className="appointment-summary"><span>Dr Maya Patel</span><b>{service}</b></div><div className="day-switch"><button type="button">‹</button><strong>Tuesday<br /><b>{today}</b></strong><button type="button">›</button></div><div className="slot-grid">{slots.map((item) => <button type="button" className={slot === item ? "selected" : ""} onClick={() => setSlot(item)} key={item}>{item}</button>)}</div><button className="patient-primary" type="button" onClick={() => setStep("details")}>Continue with {slot} <b>→</b></button></section>}
        {step === "details" && <section className="patient-screen"><button className="patient-back" onClick={() => setStep("slot")}>← Back</button><p className="patient-kicker">Step 3 of 3</p><h2>A few <em>details.</em></h2><p className="patient-copy">We only ask for what is needed to arrange your appointment.</p><label className="patient-label">YOUR NAME<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label><label className="patient-label">MOBILE NUMBER<input defaultValue="072 555 0198" inputMode="tel" autoComplete="tel" /></label><p className="privacy-mini">By continuing, you accept this practice&apos;s privacy notice and appointment policy.</p><button className="patient-primary" type="button" onClick={() => setStep("verify")}>Send verification code <b>→</b></button></section>}
        {step === "verify" && <section className="patient-screen verify-screen"><div className="verify-icon">✓</div><p className="patient-kicker">One last step</p><h2>Check your <em>phone.</em></h2><p className="patient-copy">We sent a six-digit code to 072 555 0198.</p><div className="code-dots"><input aria-label="Verification code" defaultValue="482731" maxLength={6} /></div><button className="patient-primary" type="button" onClick={completeBooking}>Verify and confirm <b>→</b></button><button className="patient-text" type="button">Send a new code</button></section>}
        {(step === "confirmed" || step === "manage") && <section className="patient-screen appointment-screen"><div className="confirmed-mark">✓</div><p className="patient-kicker">{status === "cancelled" ? "Appointment cancelled" : step === "confirmed" ? "You&apos;re booked" : "Your appointment"}</p><h2>{status === "cancelled" ? "We&apos;ll see you <em>next time.</em>" : "You&apos;re all <em>set.</em>"}</h2>{status !== "cancelled" ? <><div className="appointment-card"><span>Tuesday · 18 August</span><strong>{slot}</strong><b>Dr Maya Patel</b><small>{service}</small><hr /><small>Sea Point Medical Centre<br />12 Main Road, Cape Town</small></div><p className={`queue-note ${statusClass}`}>{queueLabel}</p><div className="appointment-actions">{status === "confirmed" && <button type="button" onClick={() => { setStatus("arrived"); setNotice("Reception has been notified that you have arrived."); }}>I&apos;ve arrived</button>}<button type="button" onClick={() => setStep("slot")}>Reschedule</button><button type="button" className="danger" onClick={() => { setStatus("cancelled"); setNotice("Your appointment has been cancelled."); }}>Cancel</button></div></> : <button className="patient-primary" type="button" onClick={reset}>Book another appointment <b>→</b></button>}{notice && <p className="patient-notice" role="status">{notice}</p>}<small className="appointment-footer">A confirmation and secure appointment link have been sent to your phone.</small></section>}
        {step === "reception" && <section className="workspace-screen"><div className="workspace-head"><button type="button" onClick={() => setStep("welcome")}>← Patient view</button><span>Harbour Care <b>Reception</b></span></div><div className="workspace-title"><div><p>Tuesday · 18 August</p><h2>Today&apos;s flow</h2></div><button type="button" onClick={() => setNotice("New walk-in added to the demo queue.")}>+ Walk-in</button></div><div className="workspace-stats"><div><span>Booked</span><b>18</b></div><div><span>Arrived</span><b>6</b></div><div><span>Waiting</span><b>3</b></div></div><div className="late-control"><div><span>Dr Patel is</span><b>On time</b></div><button type="button" onClick={() => setNotice("Demo status updated: Dr Patel is running 15 minutes late.")}>Mark running late</button></div><div className="queue-list"><div className="queue-list-head"><span>Dr Maya Patel</span><small>08:30–16:30</small></div>{queue.map((person) => <article key={person.name}><i>{person.initials}</i><div><b>{person.name}</b><small>{person.time} · General consultation</small></div><em className={person.status.replaceAll(" ", "-")}>{person.status}</em><button type="button" onClick={() => setNotice(`${person.name} moved to the next queue state in this demo.`)}>›</button></article>)}{status === "arrived" && <article className="queue-added"><i>{name.split(" ").map((part) => part[0]).join("")}</i><div><b>{name}</b><small>{slot} · {service}</small></div><em className="arrived">arrived</em><button type="button">›</button></article>}</div>{notice && <p className="workspace-notice" role="status">{notice}</p>}<p className="workspace-foot">Demo data only · No medical records or clinical notes are stored.</p></section>}
      </div>
      <aside className="health-feature-panel"><p className="eyebrow"><i /> Built for real flow</p><h2>Less reception<br /><em>chasing.</em></h2><p>The patient gets one clear journey. The receptionist gets one calm day view.</p><ol><li><span>01</span> Book without an app or account</li><li><span>02</span> Confirm and remind via WhatsApp, SMS or email</li><li><span>03</span> Check in and see only your own queue status</li><li><span>04</span> Keep clinical records in the practice&apos;s existing system</li></ol><button type="button" onClick={() => setStep("welcome")}>Restart patient journey ↺</button></aside>
    </section>

    <section className="health-demo-sell"><div><p className="eyebrow"><i /> The implementation</p><h2>Built around<br />the <em>practice.</em></h2></div><div className="health-sell-grid"><article><span>01</span><h3>Practice branded</h3><p>Use the practice name, colours, location and appointment policies—not a generic marketplace.</p></article><article><span>02</span><h3>Privacy by design</h3><p>Only appointment essentials flow through the front door. Clinical records stay in the clinical system.</p></article><article><span>03</span><h3>Works from anywhere</h3><p>Launch from a website, Google profile, QR code or WhatsApp conversation with no app-store barrier.</p></article></div><a href="/start?industry=Healthcare%20practice%20PWA">Build this for your practice →</a></section>
  </main>;
}
