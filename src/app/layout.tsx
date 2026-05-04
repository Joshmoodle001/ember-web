import type { Metadata, Viewport } from "next";
import { Space_Grotesk, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"], display: "swap" });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], display: "swap" });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"], display: "swap" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#04060e",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "Ember Web | AI-Powered Websites & Digital Solutions",
    template: "%s | Ember Web",
  },
  description:
    "Ember Web builds high-performance websites, AI chatbots, and custom web applications that convert visitors into customers. Based in South Africa, serving clients globally.",
  keywords: [
    "web development",
    "AI chatbots",
    "website design",
    "South Africa",
    "custom websites",
    "e-commerce",
    "Next.js",
    "web applications",
    "SEO",
    "digital agency",
  ],
  authors: [{ name: "Ember Web" }],
  creator: "Ember Web",
  publisher: "Ember Web",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Ember Web | AI-Powered Websites & Digital Solutions",
    description:
      "High-performance websites, AI chatbots, and custom web applications that transform how businesses operate online.",
    type: "website",
    locale: "en_ZA",
    siteName: "Ember Web",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ember Web | AI-Powered Websites & Digital Solutions",
    description:
      "High-performance websites, AI chatbots, and custom web applications that transform how businesses operate online.",
  },
  alternates: { canonical: "https://emberweb.co.za" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "Ember Web",
    description: "AI-powered web development agency",
    url: "https://emberweb.co.za",
    areaServed: "Worldwide",
    serviceType: ["Web Development", "AI Chatbots", "E-Commerce", "Web Design", "SEO"],
    address: { "@type": "PostalAddress", addressCountry: "ZA" },
    priceRange: "R9,999+",
  };

  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${dmSans.variable} ${jetbrainsMono.variable} antialiased`}>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body className="min-h-screen bg-[#04060e] text-[#f0f0f5] font-body">
        {children}
      </body>
    </html>
  );
}
