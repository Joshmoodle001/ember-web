import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EmberWeb | Websites that move business forward",
  description: "EmberWeb designs intelligent websites, useful apps, and automation systems for ambitious businesses.",
  metadataBase: new URL("https://emberweb.co.za"),
  openGraph: { title: "Websites that move business forward.", description: "AI web design · Apps · Automation", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "Websites that move business forward.", description: "AI web design · Apps · Automation", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={geist.variable}>{children}</body></html>;
}
