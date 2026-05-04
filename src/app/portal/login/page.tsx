"use client";

import { useState, FormEvent } from "react";
import { Cpu, Mail, Lock, ArrowRight, Loader2, AlertTriangle, Eye, EyeOff, Shield } from "lucide-react";

export default function PortalLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");

    try {
      if (password.trim()) {
        const res = await fetch("/api/admin/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim().toLowerCase(), password: password.trim() }),
        });
        if (res.ok) {
          window.location.href = "/admin/dashboard";
          return;
        }
        const data = await res.json();
        setError(data.error || "Invalid admin credentials");
        return;
      }

      const res = await fetch(`/api/portal?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      const token = data.client?.token;
      if (token) {
        localStorage.setItem("portal_token", token);
        window.location.href = `/portal?token=${token}`;
      } else {
        setError("Could not retrieve access token");
      }
    } catch {
      setError("Failed to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#04060e] flex items-center justify-center p-4">
      <div className="absolute inset-0 grid-bg opacity-[0.02]" />
      <div className="absolute top-[20%] right-[-5%] w-[300px] h-[300px] rounded-full bg-[#00f0ff]/[0.03] blur-[80px]" />
      <div className="absolute bottom-[10%] left-[-5%] w-[250px] h-[250px] rounded-full bg-[#3b82f6]/[0.03] blur-[60px]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00f0ff] to-[#3b82f6] flex items-center justify-center">
            <Cpu className="w-6 h-6 text-[#04060e]" />
          </div>
          <div>
            <div className="text-2xl font-display font-bold text-gradient">EMBER</div>
            <div className="text-[10px] font-mono-accent text-[#6b7394]/70 tracking-[0.2em] uppercase">Client Portal</div>
          </div>
        </div>

        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-display font-bold text-[#f0f0f5] mb-2 text-center">Welcome Back</h1>
          <p className="text-sm text-[#6b7394]/80 font-body text-center mb-6">
            Enter your email to access your project dashboard
          </p>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-400/5 border border-red-400/15 mb-4">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7394]/65" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="you@company.com"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">
                Password
                <span className="text-[#6b7394]/60 normal-case tracking-normal ml-1">(clients: leave blank)</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7394]/65" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10 pr-10"
                  placeholder="Admin only"
                  disabled={loading}
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

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
              ) : password.trim() ? (
                <><Shield className="w-4 h-4" /> Admin Login</>
              ) : (
                <><ArrowRight className="w-4 h-4" /> Access Portal</>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#121a2e]">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <Lock className="w-3 h-3 text-[#6b7394]/65" />
              <p className="text-[10px] text-[#6b7394]/70 font-mono-accent tracking-wider uppercase">Client? Just enter your email</p>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <Shield className="w-3 h-3 text-[#6b7394]/65" />
              <p className="text-[10px] text-[#6b7394]/70 font-mono-accent tracking-wider uppercase">Admin? Enter email + password</p>
            </div>
          </div>
        </div>

        <p className="text-[10px] font-mono-accent text-[#6b7394]/80 text-center mt-6">
          Ember Web · Portal · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}