import type { Metadata } from "next";
import { DM_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { SiteNav } from "./components/site-nav";
import { SiteSupport } from "./components/site-support";
import { SiteIntro } from "./components/site-intro";

const display = Space_Grotesk({ variable: "--font-display", subsets: ["latin"] });
const mono = DM_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "EmberWeb | Websites that move business forward",
  description: "EmberWeb designs intelligent websites, useful apps, and automation systems for ambitious businesses.",
  metadataBase: new URL("https://emberweb.co.za"),
  openGraph: { title: "Websites that move business forward.", description: "AI web design · Apps · Automation", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "Websites that move business forward.", description: "AI web design · Apps · Automation", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const structuredData = { "@context": "https://schema.org", "@type": "ProfessionalService", name: "EmberWeb", url: "https://emberweb.co.za", email: "info@emberweb.co.za", telephone: "+27825106642", areaServed: "South Africa", serviceType: ["Website design", "Web applications", "Business automation"] };
  return <html lang="en"><body className={`${display.variable} ${mono.variable}`}><a className="skip-link" href="#main-content">Skip to content</a><SiteIntro /><SiteNav />{children}<SiteSupport /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /></body></html>;
}
