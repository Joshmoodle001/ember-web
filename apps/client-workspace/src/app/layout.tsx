import type { Metadata } from "next";
import AuthHashBridge from "@/components/auth-hash-bridge";
import "./globals.css";
import "./control-center.css";

export const metadata: Metadata = {
  title: "EmberWeb Workspace",
  description: "The private client and project workspace for EmberWeb.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-ZA">
      <body>
        <AuthHashBridge />
        {children}
      </body>
    </html>
  );
}
