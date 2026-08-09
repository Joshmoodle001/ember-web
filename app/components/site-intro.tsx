"use client";

import { useEffect, useState } from "react";

const artifacts = ["hero-3d", "ribbon-tunnel", "founder-collab", "sphere-3d", "topographic-waves", "florist", "bubble-clay", "hands-strategy"];

export function SiteIntro() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || localStorage.getItem("emberweb-intro-seen")) return;
    setShow(true);
    const timer = window.setTimeout(() => { localStorage.setItem("emberweb-intro-seen", "true"); setShow(false); }, 4800);
    return () => window.clearTimeout(timer);
  }, []);
  const finish = () => { localStorage.setItem("emberweb-intro-seen", "true"); setShow(false); };
  if (!show) return null;
  return <aside className="site-intro intro-boot" aria-label="EmberWeb introduction"><div className="intro-noise" aria-hidden="true" /><div className="intro-orbit" aria-hidden="true">{artifacts.map((artifact, index) => <figure key={artifact} style={{ "--intro-index": index } as React.CSSProperties}><img src={`/visuals/${artifact}.png`} alt="" /><i /></figure>)}</div><div className="intro-core"><p className="intro-kicker">SYSTEM / 01 <span>ONLINE</span></p><div className="intro-mark"><b>E</b><b>W</b></div><h1><span>EMBER</span><span>WEB</span></h1><p className="intro-tagline">Digital work with real pull.</p><div className="intro-loader"><i /><span>CALIBRATING EXPERIENCE</span><b>100%</b></div></div><button type="button" onClick={finish}>Skip intro <span>→</span></button></aside>;
}
