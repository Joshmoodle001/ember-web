"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { Menu, X, Cpu, Zap, LogIn } from "lucide-react";

const navLinks = [
  { href: "#home", label: "Home" },
  { href: "#services", label: "Services" },
  { href: "#process", label: "Process" },
  { href: "#about", label: "About" },
  { href: "#portfolio", label: "Work" },
  { href: "#testimonials", label: "Voices" },
  { href: "#pricing", label: "Pricing" },
  { href: "#contact", label: "Contact" },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [time, setTime] = useState("");
  const { scrollY } = useScroll();

  useEffect(() => {
    const tick = () => {
      setTime(new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isMobileOpen]);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
    const sections = navLinks.map((l) => l.href.replace("#", "")).reverse();
    for (const section of sections) {
      const el = document.getElementById(section);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 150) { setActiveSection(section); break; }
      }
    }
  });

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? "bg-[#04060e]/92 backdrop-blur-2xl border-b border-[#00f0ff]/8 shadow-[0_4px_30px_rgba(0,0,0,0.3)]"
            : "bg-transparent"
        }`}
      >
        {isScrolled && <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#00f0ff]/20 to-transparent" />}

        <div className="container-wide flex items-center justify-between h-14 sm:h-16">
          <a href="#home" className="flex items-center gap-2 sm:gap-2.5 group">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-gradient-to-br from-[#00f0ff] to-[#3b82f6] flex items-center justify-center group-hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-shadow">
              <Cpu className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#04060e]" />
            </div>
            <span className="text-base sm:text-lg font-display font-bold">
              <span className="text-gradient">EMBER</span>
              <span className="text-[#6b7394]/70 ml-1 sm:ml-1.5 text-[8px] sm:text-[10px] font-mono-accent tracking-wider">WEB.AI</span>
            </span>
          </a>

          <div className="hidden lg:flex items-center gap-0.5">
            {navLinks.map((link) => {
              const sectionKey = link.href.replace("#", "");
              const isActive = activeSection === sectionKey;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`relative px-2.5 lg:px-3 py-2 text-[11px] lg:text-xs font-mono-accent tracking-wider uppercase transition-all duration-200 rounded-md ${
                    isActive ? "text-[#00f0ff]" : "text-[#6b7394]/75 hover:text-[#00f0ff]/70"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-[#00f0ff]/[0.06] rounded-md"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{link.label}</span>
                </a>
              );
            })}
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <a href="/portal/login" className="flex items-center gap-1.5 text-[11px] font-mono-accent tracking-wider text-[#6b7394]/75 hover:text-[#00f0ff]/70 transition-colors uppercase">
              <LogIn className="w-3 h-3" /> Client Login
            </a>
            <span className="text-[9px] font-mono-accent text-[#6b7394]/65 tracking-wider">{time} SAST</span>
            <a href="#contact" className="btn-primary text-xs px-4 py-2 sm:px-5 sm:py-2">
              <Zap className="w-3.5 h-3.5" />
              Get Started
            </a>
          </div>

          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="lg:hidden p-2 text-[#00f0ff]/70 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={isMobileOpen ? "Close menu" : "Open menu"}
          >
            {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-[#04060e]/98 backdrop-blur-2xl lg:hidden grid-bg overflow-y-auto"
          >
            <div className="flex flex-col items-center justify-center min-h-dvh gap-1 sm:gap-2 px-6 py-12">
              <div className="mb-8 text-center">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#00f0ff] to-[#3b82f6] flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(0,240,255,0.2)]">
                  <Cpu className="w-6 h-6 text-[#04060e]" />
                </div>
                <span className="text-[10px] font-mono-accent tracking-[0.3em] uppercase text-[#00f0ff]/70">
                  NAVIGATION SYSTEM
                </span>
              </div>
              {navLinks.map((link, i) => {
                const sectionKey = link.href.replace("#", "");
                const isActive = activeSection === sectionKey;
                return (
                  <motion.a
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileOpen(false)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.04 }}
                    className={`text-lg sm:text-xl font-display font-bold transition-colors py-2 sm:py-3 min-h-[44px] flex items-center ${
                      isActive ? "text-[#00f0ff]" : "text-[#6b7394] hover:text-[#00f0ff]"
                    }`}
                  >
                    {link.label}
                  </motion.a>
                );
              })}
              <motion.a
                href="/portal/login"
                onClick={() => setIsMobileOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="text-sm font-mono-accent tracking-wider text-[#6b7394] hover:text-[#00f0ff] py-2 min-h-[44px] flex items-center"
              >
                <LogIn className="w-4 h-4 mr-1.5" /> Client Login
              </motion.a>
              <motion.a
                href="#contact"
                onClick={() => setIsMobileOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="btn-primary mt-4"
              >
                <Zap className="w-4 h-4" />
                Get Started
              </motion.a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
