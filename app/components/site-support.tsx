"use client";

import { useEffect, useState } from "react";

const storageKey = "emberweb-cookie-notice";

export function SiteSupport() {
  const [showNotice, setShowNotice] = useState(false);
  useEffect(() => setShowNotice(localStorage.getItem(storageKey) !== "seen"), []);
  const closeNotice = () => { localStorage.setItem(storageKey, "seen"); setShowNotice(false); };
  return <>
    <a className="whatsapp-float" href="https://wa.me/27825106642?text=Hi%20EmberWeb%2C%20I%27d%20like%20to%20chat%20about%20a%20website" target="_blank" rel="noreferrer" aria-label="Chat to EmberWeb on WhatsApp"><span aria-hidden="true">◌</span><b>WhatsApp us</b><small>082 510 6642</small></a>
    {showNotice && <aside className="cookie-notice" aria-label="Cookie notice"><p><strong>Privacy, kept simple.</strong> This website does not use advertising or analytics cookies. We only remember that you have seen this notice on this device.</p><div><a href="/policies">Privacy details</a><button type="button" onClick={closeNotice}>Got it</button></div></aside>}
  </>;
}
