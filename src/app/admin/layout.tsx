import "../globals.css";

export const metadata = {
  title: "Ember Web Admin",
  description: "Admin dashboard for Ember Web",
  robots: "noindex, nofollow",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}