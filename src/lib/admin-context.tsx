"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { useRouter } from "next/navigation";

interface AdminContextType {
  user: { email: string; id: string } | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType>({
  user: null,
  loading: true,
  logout: async () => {},
});

export const useAdmin = () => useContext(AdminContext);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ email: string; id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await fetch("/api/admin/verify");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, []);

  const logout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setUser(null);
    router.push("/admin");
  };

  return (
    <AdminContext.Provider value={{ user, loading, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

export { AdminContext };