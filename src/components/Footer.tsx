"use client";

import { Cpu } from "lucide-react";

const services = ["AI Chatbots", "Web Development", "E-Commerce", "SEO & Performance", "Email Hosting", "Hosting & Infra"];
const company = [
  { label: "About", href: "#about" },
  { label: "Portfolio", href: "#portfolio" },
  { label: "Process", href: "#process" },
  { label: "Pricing", href: "#pricing" },
  { label: "Contact", href: "#contact" },
  { label: "Client Login", href: "/portal/login" },
];
const socials = [
  { label: "TW", href: "https://twitter.com/emberweb" },
  { label: "LI", href: "https://linkedin.com/company/emberweb" },
  { label: "GH", href: "https://github.com/emberweb" },
  { label: "IG", href: "https://instagram.com/emberweb" },
];

export default function Footer() {
  return (
    <footer className="relative border-t border-[#121a2e] bg-[#04060e]">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#00f0ff]/8 to-transparent" />

      <div className="container-wide py-10 sm:py-14 md:py-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 sm:gap-8">
          <div className="col-span-2 sm:col-span-3 md:col-span-2">
            <a href="#home" className="flex items-center gap-2 mb-4 group">
              <div className="w-8 h-8 rounded-md bg-gradient-to-br from-[#00f0ff] to-[#3b82f6] flex items-center justify-center group-hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-shadow">
                <Cpu className="w-4 h-4 text-[#04060e]" />
              </div>
              <span className="text-lg font-display font-bold">
                <span className="text-gradient">EMBER</span>
                <span className="text-[#a0a0b0]/65 ml-1 text-xs font-mono-accent">WEB</span>
              </span>
            </a>
            <p className="text-xs text-[#a0a0b0]/70 font-body leading-relaxed mb-4 max-w-[280px]">
              AI-powered web development agency. We build high-performance websites, chatbots, and digital solutions that convert visitors into customers.
            </p>
            <div className="flex gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-md border border-[#121a2e] flex items-center justify-center text-[9px] font-mono-accent text-[#a0a0b0]/65 hover:text-[#00f0ff] hover:border-[#00f0ff]/20 hover:shadow-[0_0_10px_rgba(0,240,255,0.1)] transition-all"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-mono-accent tracking-[0.2em] uppercase text-[#6b7394]/40 mb-4">Services</h4>
            <ul className="space-y-2">
              {services.map((item) => (
                <li key={item}>
                  <a href="#services" className="text-sm text-[#a0a0b0]/65 hover:text-[#00f0ff]/70 transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-mono-accent tracking-[0.2em] uppercase text-[#6b7394]/40 mb-4">Company</h4>
            <ul className="space-y-2">
              {company.map((item) => (
                <li key={item.label}>
                  <a href={item.href} className="text-sm text-[#a0a0b0]/65 hover:text-[#00f0ff]/70 transition-colors">{item.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-mono-accent tracking-[0.2em] uppercase text-[#6b7394]/40 mb-4">Legal</h4>
            <ul className="space-y-2">
              {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-[#a0a0b0]/65 hover:text-[#00f0ff]/70 transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="py-5 mt-8 border-t border-[#121a2e] flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-[10px] font-mono-accent text-[#a0a0b0]/60 tracking-wider">
            &copy; {new Date().getFullYear()} EMBER WEB. All rights reserved.
          </p>
          <p className="text-[10px] font-mono-accent text-[#6b7394]/70 tracking-wider">
            Crafted in South Africa &bull; Deployed Globally
          </p>
          <a href="/admin" className="text-[10px] font-mono-accent text-[#a0a0b0]/75 hover:text-[#a0a0b0]/65 tracking-wider transition-colors">
            ADMIN
          </a>
        </div>
      </div>
    </footer>
  );
}