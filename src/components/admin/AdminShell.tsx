"use client";

import { useState, useEffect, createContext, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, FolderKanban, CreditCard, LogOut, Menu, X, Cpu, ChevronRight, GitBranch, Shield, FileText, Star, BarChart3, Activity, Mail, Send, Target,
} from "lucide-react";
import AdminMascot from "./AdminMascot";

interface AdminShellContextType {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
}

const ShellContext = createContext<AdminShellContextType>({ sidebarOpen: false, setSidebarOpen: () => {} });

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/leads", label: "Leads", icon: Mail },
  { href: "/admin/outreach", label: "Outreach", icon: Send },
  { href: "/admin/action-plan", label: "Action Plan", icon: Target },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/workflow", label: "Workflow", icon: GitBranch },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/invoices", label: "Invoices", icon: FileText },
  { href: "/admin/activity", label: "Activity", icon: Activity },
  { href: "/admin/testimonials", label: "Reviews", icon: Star },
  { href: "/admin/admins", label: "Admins", icon: Shield },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await fetch("/api/admin/verify");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          router.push("/admin");
        }
      } catch {
        router.push("/admin");
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, [router]);

  const logout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#04060e] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <ShellContext.Provider value={{ sidebarOpen, setSidebarOpen }}>
      <div className="min-h-screen bg-[#04060e] flex">
        {/* Sidebar */}
        <aside className={`fixed md:static z-40 inset-y-0 left-0 w-64 bg-[#0a0e1a] border-r border-[#121a2e] flex flex-col transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
          <div className="p-4 sm:p-5 border-b border-[#121a2e]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-gradient-to-br from-[#00f0ff] to-[#3b82f6] flex items-center justify-center">
                <Cpu className="w-4 h-4 text-[#04060e]" />
              </div>
              <div>
                <div className="text-sm font-display font-bold text-gradient">EMBER</div>
                <div className="text-[8px] font-mono-accent text-[#6b7394]/70 tracking-wider">ADMIN PANEL</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                    isActive
                      ? "bg-[#00f0ff]/[0.08] text-[#00f0ff] border border-[#00f0ff]/10"
                      : "text-[#6b7394]/80 hover:text-[#6b7394] hover:bg-[#0a0e1a]"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="font-mono-accent text-[11px] tracking-wider uppercase">{item.label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
                </a>
              );
            })}
          </nav>

          <div className="p-3 border-t border-[#121a2e]">
            <div className="px-3 py-2 mb-2">
              <div className="text-[10px] font-mono-accent text-[#6b7394]/70 truncate">{user.email}</div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-red-400/60 hover:text-red-400 hover:bg-red-400/5 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-mono-accent text-[11px] tracking-wider uppercase">Logout</span>
            </button>
          </div>
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <header className="sticky top-0 z-20 bg-[#04060e]/90 backdrop-blur-xl border-b border-[#121a2e] px-4 sm:px-6 py-3 flex items-center justify-between">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-2 text-[#6b7394]/80 hover:text-[#6b7394]">
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono-accent text-[#6b7394]/70 tracking-wider">SYSTEM ACTIVE</span>
            </div>
          </header>
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
        <AdminMascot />
      </div>
    </ShellContext.Provider>
  );
}