"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const links = [
  ["Work", "/work"],
  ["Packages", "/packages"],
  ["Free audit", "/audit"],
  ["How it works", "/process"],
  ["Industries", "/industries"],
  ["EmberCare", "/care"],
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  return <header className="site-header">
    <nav className="site-nav" aria-label="Main navigation">
      <a className="brand brand-lockup" href="/" aria-label="EmberWeb home"><img src="/brand/emberweb-weave.png" alt="" /><span className="brand-wordmark">EMBER<span>WEB</span></span></a>
      <div className="site-nav-links">
        {links.map(([label, href]) => <a key={href} href={href} className={pathname === href ? "is-active" : ""} aria-current={pathname === href ? "page" : undefined}>{label}</a>)}
      </div>
      <a className="site-nav-cta" href="/start">Start a project <span aria-hidden="true">→</span></a>
      <button className="menu-toggle" type="button" aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen((current) => !current)}><span className="sr-only">{open ? "Close" : "Open"} navigation</span><i /><i /></button>
    </nav>
    <div className={`mobile-nav ${open ? "is-open" : ""}`} id="mobile-navigation" aria-hidden={!open}>
      {links.map(([label, href], index) => <a key={href} href={href} tabIndex={open ? 0 : -1}><span>0{index + 1}</span>{label}<b>→</b></a>)}
      <a className="mobile-nav-cta" href="/start" tabIndex={open ? 0 : -1}>Start a project <b>→</b></a>
    </div>
  </header>;
}
