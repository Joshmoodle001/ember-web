const projects = [
  {
    id: "wholesale-hub", name: "Wholesale operations hub", category: "business-systems", type: "Private business platform",
    summary: "A workspace for wholesale teams to organise tasks, management planning and reporting. It brings team activity and follow-up work into a shared place, with access for authorised users.",
    capabilities: ["Team task management", "Management planning", "Reports and follow-ups"],
    image: "workspace", alt: "Illustration of a workspace with project, invoice and request panels.",
    service: "Custom web app", goal: "Discuss a wholesale operations and planning hub",
  },
  {
    id: "automotive-workshop", name: "Automotive workshop bookings", category: "business-systems", type: "Automotive workshop platform",
    summary: "A workshop website and installable web app combining service enquiries and appointment requests with customer accounts and staff workflows. Customers can follow booking updates, while the workshop can manage its services and records.",
    capabilities: ["Service bookings", "Customer accounts", "Workshop administration"],
    image: "workspace", alt: "Illustration of a workspace with project, invoice and request panels.",
    service: "Custom web app", goal: "Discuss an automotive workshop website and booking platform",
  },
  {
    id: "whatsapp-studio", name: "WhatsApp automation studio", category: "business-systems", type: "Private automation platform",
    summary: "A private workspace for organising linked WhatsApp accounts, configuring chat workflows and reviewing bot activity. It brings account management, selected conversations and scheduled document delivery into one interface.",
    capabilities: ["Linked account management", "Chat workflows", "Scheduled document delivery"],
    image: "broadcasts", alt: "Illustration of a mobile update feed beside a desktop publishing panel.",
    service: "Workflow automation", goal: "Discuss a messaging and document workflow workspace",
  },
  {
    id: "vibeos", name: "VibeOS", category: "web-platforms", type: "Windows desktop pilot · in development",
    summary: "An experimental Windows desktop workspace for opening tools, registering project folders and reviewing project information. Its AI command centre can prepare plans for review; advanced automation and deployment features remain under development.",
    capabilities: ["Project organisation", "Windows app launcher", "AI planning"],
    image: "workspace", alt: "Illustration of a workspace with project, invoice and request panels.",
    service: "Custom web app", goal: "Discuss a desktop workspace and project dashboard",
  },
  {
    id: "biosync", name: "BioSync", category: "business-systems", type: "EmberWeb product", featured: true,
    summary: "An attendance and workforce workspace combining attendance reports, shift rosters and leave administration. Multi-organisation access gives each organisation its own working view.",
    capabilities: ["Attendance reporting", "Rosters & scheduling", "Multi-organisation access"],
    image: "attendance", alt: "Illustration of an attendance workspace with a weekly roster and reporting panels.",
    url: "https://app-biosync.co.za/", service: "Custom web app", goal: "Discuss an attendance and scheduling system like BioSync",
  },
  {
    id: "fuel-intelligence", name: "Fuel Intelligence", category: "business-systems", type: "Private business system",
    summary: "A fleet fuel reporting workspace that brings fuel information, review controls and an audit workflow together for staff responsible for checking reports.",
    capabilities: ["Fuel reporting", "Review controls", "Audit workflow"],
    image: "fuel", alt: "Illustration of a fuel reporting dashboard with a usage chart and a review queue.",
    service: "Custom web app", goal: "Discuss a fuel reporting and review workspace",
  },
  {
    id: "asset-management", name: "Asset management", category: "business-systems", type: "Private business system",
    summary: "A working register for equipment, custody and regional allocations, helping teams keep track of devices and their handovers.",
    capabilities: ["Equipment register", "Custody history", "Regional allocations"],
    image: "assets", alt: "Illustration of a device register with laptops, tablets and allocation records.",
    service: "Custom web app", goal: "Discuss a device and asset management system",
  },
  {
    id: "shift-planning", name: "Shift planning", category: "business-systems", type: "Private business tool",
    summary: "Build a weekly working pattern, review the shift sheet and save a printable PDF record.",
    capabilities: ["Weekly shift patterns", "Form-based planning", "Printable PDF records"],
    image: "shifts", alt: "Illustration of a weekly shift planner alongside a printable shift sheet.",
    service: "Custom web app", goal: "Discuss a shift planning and document generation tool",
  },
  {
    id: "expiry-reporting", name: "Stock expiry reporting", category: "business-systems", type: "Private business tool",
    summary: "Make a stock report easier to capture: choose the store, identify the product, then add its date and quantity.",
    capabilities: ["Store-based capture", "Barcode entry", "Expiry dates & quantities"],
    image: "expiry", alt: "Illustration of a mobile stock report with a barcode, expiry date and quantity fields.",
    service: "Custom web app", goal: "Discuss a mobile stock and expiry reporting tool",
  },
  {
    id: "digital-signage", name: "Digital signage", category: "business-systems", type: "Private display system",
    summary: "Give reception and training-room screens their own display experiences, with a simple place to choose what to run.",
    capabilities: ["Room-based displays", "Screen selection", "Browser playback"],
    image: "signage", alt: "Illustration of reception and training-room display screens with a display selector.",
    service: "Custom web app", goal: "Discuss a digital signage and display experience",
  },
  {
    id: "digital-catalogue", name: "Digital catalogue", category: "web-platforms", type: "Private business platform",
    summary: "A shared product reference with separate sign-in paths for field teams, representatives and administrators.",
    capabilities: ["Product catalogue", "Field-team access", "Role-based entry"],
    image: "catalogue", alt: "Illustration of a digital product catalogue with category navigation and product cards.",
    service: "Custom web app", goal: "Discuss a digital catalogue for customers or field teams",
  },
  {
    id: "flexiform", name: "FlexiForm", category: "web-platforms", type: "Web application",
    summary: "A form builder for Google Sheets. Create fields, map each field to a spreadsheet column and share a link for people to submit information.",
    capabilities: ["Google Sheets connection", "Custom form fields", "Submission capture"],
    image: "forms", alt: "Illustration of a custom form connected to spreadsheet columns.",
    service: "Workflow automation", goal: "Discuss a form and spreadsheet workflow like FlexiForm",
  },
  {
    id: "emberweb-workspace", name: "EmberWeb workspace", category: "web-platforms", type: "Private EmberWeb platform",
    summary: "A shared home for client projects, invoices and requests, with separate views for clients and the team managing the work.",
    capabilities: ["Client dashboards", "Projects & invoices", "Requests & team access"],
    image: "workspace", alt: "Illustration of a client workspace with project progress, an invoice area and a request thread.",
    service: "Custom web app", goal: "Discuss a client portal and project management workspace",
  },
  {
    id: "me-body", name: "Me Body", category: "mobile-consumer", type: "Consumer web app",
    summary: "An installable, local-first experience for food, workouts and personal progress, designed around everyday use on a phone.",
    capabilities: ["Nutrition & workout logs", "Local-first storage", "Installable PWA"],
    image: "wellness", alt: "Illustration of a mobile wellness app with activity, food and progress panels.",
    url: "https://me-body.vercel.app/", service: "Custom web app", goal: "Discuss a local-first consumer app like Me Body",
  },
  {
    id: "team-broadcasts", name: "Team broadcasts", category: "mobile-consumer", type: "Private communications app",
    summary: "Put team updates, images and videos into a mobile-first feed, with a separate desktop experience for administrators to post.",
    capabilities: ["Mobile update feed", "Image & video posts", "Installable experience"],
    image: "broadcasts", alt: "Illustration of a mobile team-update feed beside a desktop publishing panel.",
    service: "Custom web app", goal: "Discuss a mobile team communications and broadcast app",
  },
  {
    id: "kingdom-index", name: "Kingdom Index", category: "content-learning", type: "Content & learning platform",
    summary: "A Christian content hub with age-group pathways, making the starting point clear for adults and supervised younger visitors.",
    capabilities: ["Age-group pathways", "Content discovery", "Guided entry"],
    image: "learning", alt: "Illustration of a learning hub with reading collections and audience pathways.",
    url: "https://web-three-rust-49.vercel.app/", service: "Custom web app", goal: "Discuss a content and learning platform like Kingdom Index",
  },
];

export const PORTFOLIO_PROJECTS = Object.freeze(projects.map(project => Object.freeze({
  ...project,
  capabilities: Object.freeze([...project.capabilities]),
})));


const evidence = {
  "wholesale-hub": ["Client operations team", "Vercel + GitHub wholesale hub", "deployed", "anonymized", "Feature summary only"],
  "automotive-workshop": ["Workshop client", "GitHub + Vercel workshop build", "built", "anonymized", "Client name and imagery await approval"],
  "whatsapp-studio": ["EmberWeb", "Codex + GitHub + Vercel linked-account studio", "built", "private walkthrough", "High-level public summary only"],
  vibeos: ["EmberWeb", "Codex project and local pilot README", "pilot", "draft", "Existing public pilot summary only"],
  biosync: ["EmberWeb", "GitHub, Vercel and public product page", "deployed", "public", "Existing portfolio entry"],
  "fuel-intelligence": ["Client operations team", "GitHub and Vercel", "deployed", "anonymized", "Feature summary only"],
  "asset-management": ["Client operations team", "Vercel tracker and asset-atlas, Codex IT tracker", "deployed", "anonymized", "Grouped asset tools"],
  "shift-planning": ["Client operations team", "Vercel shift-builder and Codex reporting workspace", "built", "anonymized", "Feature summary only"],
  "expiry-reporting": ["Client operations team", "Vercel expiry variants", "deployed", "anonymized", "Grouped expiry variants"],
  "digital-signage": ["Client operations team", "Codex reception TV and Vercel boards", "built", "anonymized", "Feature summary only"],
  "digital-catalogue": ["Client operations team", "GitHub catalogue and Vercel staging/production", "deployed", "anonymized", "Grouped catalogue variants"],
  flexiform: ["EmberWeb", "GitHub and Vercel", "demo review", "public", "Demo withheld pending persistence verification"],
  "emberweb-workspace": ["EmberWeb", "Ember Web monorepo and Vercel portal project", "deployed", "private walkthrough", "Existing public summary only"],
  "me-body": ["EmberWeb", "GitHub and public Vercel app", "deployed", "public", "Existing portfolio entry"],
  "team-broadcasts": ["Client operations team", "GitHub broadcasts", "built", "anonymized", "Feature summary only"],
  "kingdom-index": ["EmberWeb", "GitHub and public Vercel site", "deployed", "public", "Existing portfolio entry"],
};

export const PROJECT_INVENTORY = Object.freeze(PORTFOLIO_PROJECTS.map(project => {
  const [owner, source, stage, visibility, permission] = evidence[project.id];
  return Object.freeze({ project, owner, evidence: source, stage, visibility, permission });
}));

export const CASE_STUDY_DRAFTS = Object.freeze([
  { projectId: "automotive-workshop", problem: "Drivers need to request a service from a phone and know whether a slot is confirmed.", limits: "Workshop name and visuals require approval. Booking conversion and operational outcomes have not been measured." },
  { projectId: "wholesale-hub", problem: "Operational tasks, planning and reports need a shared place for review and follow-up.", limits: "Keep the client anonymous. No independently measured time savings or adoption figures are available." },
  { projectId: "me-body", problem: "Logging food and training should be convenient on a phone, even when a connection is unavailable.", limits: "Describe only the visible product experience. No health or engagement outcomes have been measured." },
]);
