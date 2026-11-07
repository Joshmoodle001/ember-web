"use client";

import { usePathname } from "next/navigation";

const routes = [
  ["Packages", "Find a starting point", "/packages"],
  ["Free audit", "See what to improve first", "/audit"],
  ["How it works", "Understand the full route", "/process"],
  ["Start", "Tell us where you are going", "/start"],
];

export function SiteRouteGuide() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  const suggested = routes.filter(([, , href]) => href !== pathname).slice(0, 3);
  return <section className="route-guide" aria-label="Continue exploring EmberWeb">
    <div><p className="section-label">[ Keep moving ]</p><h2>One clear<br /><em>next step.</em></h2></div>
    <div className="route-guide-links">{suggested.map(([label, description, href], index) => <a href={href} key={href}><span>0{index + 1} / {label.toUpperCase()}</span><strong>{description}</strong><b aria-hidden="true">→</b></a>)}</div>
  </section>;
}
