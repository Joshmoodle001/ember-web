"use client";

import { usePathname } from "next/navigation";

const content: Record<string, { eyebrow: string; title: string; points: [string, string][] }> = {
  "/packages": { eyebrow: "[ What the numbers mean ]", title: "A starting point with room to grow.", points: [["Clear scope", "The right package becomes a written, agreed scope before payment."], ["No payment on site", "Secure PayFast links are sent only after the work is confirmed."], ["Care included", "Every option starts with the practical essentials after launch."]] },
  "/audit": { eyebrow: "[ A useful result ]", title: "Advice you can actually use.", points: [["Prioritised", "We focus on the biggest obstacles first, not a long generic checklist."], ["Mobile-aware", "The review considers the device most local customers use to decide."], ["Action-led", "You leave knowing the clearest next improvement to make."]] },
  "/process": { eyebrow: "[ Built for confidence ]", title: "No black box between idea and launch.", points: [["Visible decisions", "You see the route before significant build work begins."], ["Designed for action", "Each stage protects clarity, momentum and a usable next step."], ["Human support", "A real person stays available after the site has launched."]] },
  "/work": { eyebrow: "[ What good work changes ]", title: "A website should make the next choice easier.", points: [["Earn attention", "A stronger first impression gives your business a fairer shot."], ["Build trust", "Proof, clarity and a real human tone reduce hesitation."], ["Create action", "Calls, forms and WhatsApp make the next move obvious."]] },
  "/industries": { eyebrow: "[ Designed around people ]", title: "Different businesses need different proof.", points: [["Service teams", "Make a quote, call or WhatsApp request effortless."], ["Appointment businesses", "Make availability, credibility and booking feel natural."], ["Growing operators", "Connect the site to the admin and follow-up work behind it."]] },
  "/care": { eyebrow: "[ Care with a purpose ]", title: "The quiet work that keeps a site useful.", points: [["Protected", "Core maintenance, SSL and backups keep the foundation looked after."], ["Current", "Small improvements stop the site from slowly going stale."], ["Reachable", "You know where to go when the business needs a change."]] },
  "/policies": { eyebrow: "[ Working clearly ]", title: "The practical commitments behind the site.", points: [["Ownership", "Your domain and approved business content remain yours."], ["Privacy", "Enquiry details are used to help with your project—not sold."], ["Plain language", "The project scope confirms costs, access and care in writing."]] },
  "/start": { eyebrow: "[ A good first brief ]", title: "A few useful details make the first chat better.", points: [["Your goal", "Tell us what you want the website to change for the business."], ["Your timing", "An honest timeline helps us suggest the sensible route."], ["Your context", "An existing site or a rough idea is enough to begin."]] },
};

export function SitePagePulse() {
  const pathname = usePathname();
  const page = content[pathname];
  if (!page) return null;
  return <section className="page-pulse"><div><p className="section-label">{page.eyebrow}</p><h2>{page.title}</h2></div><div className="page-pulse-grid">{page.points.map(([title, detail], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{detail}</p></article>)}</div></section>;
}
