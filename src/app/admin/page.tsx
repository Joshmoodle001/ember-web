"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock, Mail, Cpu } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        window.location.href = "/admin/dashboard";
      } else {
        const data = await res.json();
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#04060e] flex items-center justify-center p-4">
      <div className="absolute inset-0 grid-bg opacity-50" />
      <div className="absolute top-[20%] right-[-5%] w-[300px] h-[300px] rounded-full bg-[#00f0ff]/[0.03] blur-[80px]" />
      <div className="absolute bottom-[10%] left-[-5%] w-[250px] h-[250px] rounded-full bg-[#3b82f6]/[0.03] blur-[60px]" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="card p-6 sm:p-8">
          <div className="flex items-center justify-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00f0ff] to-[#3b82f6] flex items-center justify-center">
              <Cpu className="w-5 h-5 text-[#04060e]" />
            </div>
            <div>
              <div className="text-lg font-display font-bold text-gradient">EMBER</div>
              <div className="text-[9px] font-mono-accent text-[#6b7394]/70 tracking-wider">ADMIN PANEL</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7394]/70" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="admin@emberweb.co.za"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7394]/70" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10 pr-10"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7394]/70 hover:text-[#6b7394] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-400/80 text-sm font-mono-accent text-center bg-red-400/5 py-2 rounded-md">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? "Authenticating..." : "Access Dashboard"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#121a2e]">
            <p className="text-[10px] font-mono-accent text-[#6b7394]/65 text-center tracking-wider">
              AUTHORIZED ACCESS ONLY
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}