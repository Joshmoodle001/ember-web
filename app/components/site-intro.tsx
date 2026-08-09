"use client";

import { useEffect, useState } from "react";

const images = ["hero-3d", "founder-collab", "ribbon-tunnel", "clay-pillar", "topographic-waves", "florist"];

export function SiteIntro() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || localStorage.getItem("emberweb-intro-seen")) return;
    setShow(true);
    const timer = window.setTimeout(() => { localStorage.setItem("emberweb-intro-seen", "true"); setShow(false); }, 3600);
    return () => window.clearTimeout(timer);
  }, []);
  const finish = () => { localStorage.setItem("emberweb-intro-seen", "true"); setShow(false); };
  if (!show) return null;
  return <aside className="site-intro" aria-label="EmberWeb introduction"><div className="intro-grid" aria-hidden="true">{images.map((image, index) => <img key={image} src={`/visuals/${image}.png`} alt="" style={{ "--intro-index": index } as React.CSSProperties} />)}</div><div className="intro-copy"><p>EMBER<span>WEB</span></p><h1><span>Digital work</span><span>with real pull.</span></h1><small>DESIGNING THE NEXT MOVE <i /></small></div><button type="button" onClick={finish}>Skip intro <span>→</span></button></aside>;
}
