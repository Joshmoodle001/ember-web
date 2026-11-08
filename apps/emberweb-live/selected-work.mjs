import { PORTFOLIO_PROJECTS } from "./portfolio.mjs";

const escape = value => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export function selectedWork() {
  const projects = ["biosync", "me-body", "flexiform"].map(id => PORTFOLIO_PROJECTS.find(project => project.id === id));
  return `<section class="section selected-work" id="selected-work" aria-labelledby="selected-work-title"><div class="container">
    <header class="work-heading"><p class="eyebrow">03 / Selected applications</p><h2 id="selected-work-title">Explore what<br><em>we’ve built.</em></h2><a class="text-link" href="/portfolio">Explore the portfolio <span aria-hidden="true">↗</span></a></header>
    <div class="project-explorer" data-project-explorer>
      <div class="project-picker" role="group" aria-label="Explore selected applications" hidden>${projects.map((project, index) => `<button type="button" data-project-target="selected-${project.id}" aria-controls="selected-${project.id}" aria-pressed="${index === 0}"><span>0${index + 1}</span><strong>${escape(project.name)}</strong><span aria-hidden="true">↗</span></button>`).join("")}</div>
      <div class="project-panels">${projects.map((project, index) => `<article class="project-panel project-panel-${project.id}" id="selected-${project.id}">
        <div class="project-visual"><span class="project-edition" aria-hidden="true">EMBERWEB / SELECTED APPLICATION 0${index + 1}</span><img src="/portfolio/${project.image}.svg" alt="${escape(project.alt)}" width="1200" height="800" loading="lazy"><span class="project-visual-note">Illustrative interface · no client data</span></div>
        <div class="project-description"><div><p class="eyebrow">${escape(project.type)}</p><h3>${escape(project.name)}</h3></div><p>${escape(project.summary)}</p><a class="text-link" href="${escape(project.url)}" target="_blank" rel="noopener noreferrer">Open ${escape(project.name)} <span class="sr-only">(opens in a new tab)</span><span aria-hidden="true">↗</span></a></div>
      </article>`).join("")}</div>
    </div>
  </div></section>`;
}
