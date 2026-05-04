"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, Sparkles, Zap, Play } from "lucide-react";
import CountUp from "./CountUp";
import GlitchText from "./GlitchText";
import ParticleField from "./ParticleField";
import MatrixRain from "./motion/MatrixRain";
import NeonPulse from "./motion/NeonPulse";

const words = ["The Future", "AI-Powered", "Intelligent", "Next-Gen", "Beyond"];
const stats = [
  { value: 150, suffix: "+", label: "Projects Deployed" },
  { value: 98, suffix: "%", label: "Client Retention" },
  { value: 24, suffix: "/7", label: "AI Monitoring" },
  { value: 5, suffix: "+", label: "Years Leading" },
];

const trustedLogos = [
  "Next.js", "React", "TypeScript", "Supabase", "Vercel", "Tailwind CSS",
];

export default function Hero({ onLaunch }: { onLaunch?: () => void }) {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setWordIndex((i) => (i + 1) % words.length), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <section id="home" className="relative min-h-[100dvh] flex items-center overflow-hidden grid-bg">
      <MatrixRain opacity={0.08} speed={80} />
      <ParticleField />

      <div className="absolute top-[10%] right-[-10%] w-[300px] h-[300px] md:w-[500px] md:h-[500px] rounded-full bg-[#00f0ff]/[0.03] blur-[80px] md:blur-[120px]" />
      <div className="absolute bottom-[-5%] left-[-5%] w-[250px] h-[250px] md:w-[350px] md:h-[350px] rounded-full bg-[#3b82f6]/[0.04] blur-[60px] md:blur-[100px]" />
      <div className="absolute top-[40%] left-[50%] w-[150px] h-[150px] md:w-[200px] md:h-[200px] rounded-full bg-[#ff6b2b]/[0.02] blur-[60px] md:blur-[80px]" />

      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#00f0ff]/20 to-transparent" />

      <div className="relative z-10 container-wide py-20 sm:py-28 md:py-32 lg:py-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.35 }}
              className="inline-flex items-center gap-2 mb-5 sm:mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute h-full w-full rounded-full bg-[#00f0ff] opacity-75" />
                <span className="relative rounded-full h-2 w-2 bg-[#00f0ff]" />
              </span>
              <span className="text-[8px] sm:text-[10px] font-mono-accent tracking-[0.15em] sm:tracking-[0.25em] uppercase text-[#00f0ff]/70">
                SYSTEM ONLINE // ACCEPTING CLIENTS
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="font-display leading-[1.05] mb-6"
            >
              <GlitchText
                text="Take Your Business"
                as="span"
                className="block text-[clamp(2rem,8vw,5rem)] font-bold text-[#e8eaf6] tracking-tight leading-[1.1]"
              />
              <motion.span
                key={wordIndex}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="block text-[clamp(2.2rem,9vw,5.5rem)] font-bold text-gradient mt-1 leading-[1.1]"
              >
                {words[wordIndex]}
              </motion.span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="max-w-xl text-[#6b7394] text-sm sm:text-base md:text-lg font-body mb-3 sm:mb-4 leading-relaxed"
            >
              AI chatbots, intelligent websites, and automation that transform how businesses
              operate. We build digital experiences that convert, engage, and scale.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.55 }}
              className="flex items-center gap-2 mb-5 sm:mb-8"
            >
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#ff6b2b]/60" />
              <span className="text-[9px] sm:text-[11px] font-mono-accent text-[#6b7394]/80 tracking-wider uppercase">
                Websites // Chatbots // AI // Hosting // Email // E-Commerce
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="flex flex-wrap gap-3"
            >
              <NeonPulse color="#ff6b2b" intensity="normal">
                <button onClick={onLaunch} className="btn-primary">
                  <Zap className="w-4 h-4" />
                  Launch Your Future
                </button>
              </NeonPulse>
              <NeonPulse color="#00f0ff" intensity="subtle">
                <a href="#portfolio" className="btn-secondary">
                  <Play className="w-4 h-4" />
                  View Our Work
                </a>
              </NeonPulse>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="mt-8 sm:mt-10 flex items-center gap-4"
            >
              <div className="flex -space-x-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="w-7 h-7 rounded-full border-2 border-[#04060e] bg-gradient-to-br from-[#00f0ff]/20 to-[#3b82f6]/20 flex items-center justify-center">
                    <span className="text-[8px] font-mono-accent text-[#00f0ff]/80">{["SM", "MB", "LN", "DC"][i]}</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex gap-0.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span key={i} className="text-[#f7a541] text-[10px]">&#9733;</span>
                  ))}
                </div>
                <span className="text-[9px] font-mono-accent text-[#6b7394]/75">Trusted by 150+ businesses</span>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="lg:col-span-5 hidden lg:block"
          >
            <div className="card-featured p-5 sm:p-6 md:p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#00f0ff]/30 to-transparent" />
              <div className="flex items-center gap-2 mb-5">
                <div className="w-2 h-2 rounded-full bg-[#00f0ff]/60 animate-pulse" />
                <span className="text-[9px] font-mono-accent tracking-[0.2em] uppercase text-[#00f0ff]/75">
                  EMBER AI SYSTEMS
                </span>
              </div>
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 + i * 0.1 }}
                  className="flex items-baseline justify-between py-4 border-b border-[#121a2e] last:border-0"
                >
                  <span className="text-2xl md:text-3xl font-display font-bold text-gradient">
                    <CountUp end={stat.value} duration={2500} suffix={stat.suffix} />
                  </span>
                  <span className="text-[10px] font-mono-accent text-[#6b7394] tracking-wider uppercase">{stat.label}</span>
                </motion.div>
              ))}
              <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#3b82f6]/20 to-transparent" />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5 }}
              className="mt-4 flex flex-wrap gap-2 justify-center"
            >
              {trustedLogos.map((logo) => (
                <span key={logo} className="px-2.5 py-1 text-[8px] font-mono-accent text-[#6b7394]/80 border border-[#121a2e]/50 rounded uppercase tracking-wider">
                  {logo}
                </span>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 0.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 hidden lg:flex flex-col items-center gap-2"
      >
        <span className="text-[8px] font-mono-accent text-[#6b7394]/80 tracking-[0.2em] uppercase">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowDown className="w-4 h-4 text-[#00f0ff]/65" />
        </motion.div>
      </motion.div>

      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#00f0ff]/10 to-transparent" />
    </section>
  );
}
