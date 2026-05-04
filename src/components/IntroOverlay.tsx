"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  trail: { x: number; y: number }[];
  type: "spark" | "ember";
}

function PortalExplosion({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef<number>(0);
  const startedRef = useRef(false);

  const spawn = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const colors = ["#00f0ff", "#3b82f6", "#00e5c3", "#ff6b2b", "#f7a541", "#ffffff", "#00f0ff", "#3b82f6"];
    const ps: Particle[] = [];
    for (let i = 0; i < 200; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 18 + 4;
      ps.push({ x: cx, y: cy, vx: Math.cos(angle) * speed * (0.8 + Math.random() * 0.6), vy: Math.sin(angle) * speed * (0.8 + Math.random() * 0.6), size: Math.random() * 5 + 1.5, color: colors[Math.floor(Math.random() * colors.length)], life: 0, maxLife: Math.random() * 70 + 35, trail: [], type: "spark" });
    }
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 10 + 6;
      ps.push({ x: cx, y: cy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: Math.random() * 8 + 3, color: i < 20 ? "#ff6b2b" : "#f7a541", life: 0, maxLife: Math.random() * 40 + 25, trail: [], type: "ember" });
    }
    particlesRef.current = ps;
  }, []);

  useEffect(() => {
    if (!active) return;
    spawn();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let running = true;
    const draw = () => {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particlesRef.current.forEach((p) => {
        p.life++;
        if (p.life > p.maxLife) return;
        alive = true;
        const progress = p.life / p.maxLife;
        p.x += p.vx; p.y += p.vy;
        p.vy += p.type === "ember" ? 0.25 : 0.08;
        p.vx *= 0.985; p.vy *= 0.985;
        if (p.type === "spark" && p.life % 2 === 0) { p.trail.push({ x: p.x, y: p.y }); if (p.trail.length > 6) p.trail.shift(); }
        const a = Math.pow(1 - progress, 1.5);
        const s = p.size * (1 - progress * 0.4);
        if (p.type === "spark" && p.trail.length > 1) {
          ctx.beginPath(); ctx.moveTo(p.trail[0].x, p.trail[0].y);
          for (let t = 1; t < p.trail.length; t++) ctx.lineTo(p.trail[t].x, p.trail[t].y);
          ctx.lineTo(p.x, p.y); ctx.strokeStyle = p.color; ctx.globalAlpha = a * 0.3; ctx.lineWidth = s * 0.5; ctx.stroke();
        }
        ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill();
        if (p.type === "ember" && progress < 0.3) { ctx.beginPath(); ctx.arc(p.x, p.y, s * 3, 0, Math.PI * 2); ctx.globalAlpha = a * 0.05; ctx.fillStyle = p.color; ctx.fill(); }
        ctx.globalAlpha = 1;
      });
      if (alive) frameRef.current = requestAnimationFrame(draw);
    };
    frameRef.current = requestAnimationFrame(draw);
    return () => { running = false; cancelAnimationFrame(frameRef.current); };
  }, [active, spawn]);
  if (!active) return null;
  return <canvas ref={canvasRef} className="fixed inset-0 z-[100] pointer-events-none" />;
}

export default function IntroOverlay({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"idle" | "charging" | "exploding" | "welcome" | "done">("idle");
  const [hasVisited] = useState(() => {
    if (typeof window === "undefined") return false;
    const visited = sessionStorage.getItem("ember-visited");
    return !!visited;
  });

  useEffect(() => {
    if (hasVisited) { onComplete(); }
  }, [hasVisited, onComplete]);

  if (hasVisited) return null;

  const handleStart = () => {
    setPhase("charging");
    setTimeout(() => setPhase("exploding"), 400);
    setTimeout(() => setPhase("welcome"), 900);
    setTimeout(() => { sessionStorage.setItem("ember-visited", "1"); onComplete(); }, 2800);
  };

  return (
    <AnimatePresence>
      {phase !== "done" ? (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ pointerEvents: phase === "idle" ? "auto" : "none", background: "#04060e" }}
        >
          {phase !== "exploding" && phase !== "welcome" && (
            <div className="absolute inset-0 grid-bg opacity-20" />
          )}

          {phase === "idle" && (
            <>
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: [0, 0.5, 0.3], scale: 1 }} transition={{ delay: 0.3, duration: 3, repeat: Infinity, ease: "easeInOut" }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] rounded-full bg-[#00f0ff]/[0.015] blur-[100px]" />
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 0.4, 0] }} transition={{ delay: 1, duration: 3, repeat: Infinity, ease: "easeInOut" }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] sm:w-[350px] sm:h-[350px] rounded-full bg-[#ff6b2b]/[0.03] blur-[80px]" />
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#00f0ff]/15 to-transparent opacity-50" />
              <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#3b82f6]/15 to-transparent opacity-50" />
            </>
          )}

          {phase === "idle" && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }} className="absolute top-[12%] sm:top-[15%] text-center">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8, duration: 0.6 }} className="flex items-center gap-3 justify-center mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#00f0ff] to-[#3b82f6] flex items-center justify-center shadow-[0_0_30px_rgba(0,240,255,0.25)]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#04060e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sm:w-6 sm:h-6"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                </div>
                <div>
                  <span className="text-xl sm:text-2xl font-display font-bold text-gradient">EMBER</span>
                  <span className="text-[#6b7394]/80 ml-1.5 text-[10px] font-mono-accent">WEB</span>
                </div>
              </motion.div>
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} transition={{ delay: 1.2, duration: 0.8 }} className="text-[9px] sm:text-[10px] font-mono-accent tracking-[0.3em] sm:tracking-[0.4em] uppercase text-[#6b7394]/70">AI-Powered Digital Solutions</motion.span>
            </motion.div>
          )}

          <motion.div
            className="relative z-10 flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={phase === "charging" ? { scale: 1.15, opacity: 1 } : phase === "exploding" ? { scale: 0.1, opacity: 0 } : { opacity: 1, scale: 1 }}
            transition={phase === "charging" ? { duration: 0.4, ease: "easeIn" } : phase === "exploding" ? { duration: 0.3, ease: "easeIn" } : { delay: 0.3, duration: 1 }}
          >
            {phase === "idle" && (
              <motion.button onClick={handleStart} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: [0.94, 1.03, 0.94] }} transition={{ opacity: { delay: 2, duration: 0.6 }, scale: { delay: 2.6, duration: 2.5, repeat: Infinity, ease: "easeInOut" } }} className="relative group cursor-pointer outline-none">
                <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.15, 0, 0.15] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} className="absolute inset-0 -m-6 rounded-full border border-[#00f0ff]/20" />
                <motion.div animate={{ scale: [1, 1.6, 1], opacity: [0.08, 0, 0.08] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} className="absolute inset-0 -m-10 rounded-full border border-[#00f0ff]/10" />
                <motion.div animate={{ scale: [1, 1.8, 1], opacity: [0.04, 0, 0.04] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute inset-0 -m-14 rounded-full border border-[#3b82f6]/8" />
                <div className="absolute inset-0 -m-4 rounded-full bg-[#00f0ff]/[0.03] animate-[glow-pulse_3s_ease-in-out_infinite]" />
                <div className="absolute inset-0 -m-8 rounded-full bg-[#00f0ff]/[0.015] animate-[glow-pulse_3s_ease-in-out_infinite_0.5s]" />
                <div className="relative px-10 py-5 sm:px-14 sm:py-6 bg-gradient-to-br from-[#00f0ff]/10 via-[#3b82f6]/5 to-[#ff6b2b]/5 border border-[#00f0ff]/30 group-hover:border-[#00f0ff]/60 rounded-2xl backdrop-blur-md transition-all duration-300 group-hover:shadow-[0_0_60px_rgba(0,240,255,0.2),0_0_120px_rgba(0,240,255,0.05)]">
                  <div className="flex items-center gap-3">
                    <motion.svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#00f0ff]" animate={{ x: [0, 2, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}><polygon points="5 3 19 12 5 21 5 3" /></motion.svg>
                    <span className="text-[#f0f0f5] font-display font-bold text-base sm:text-lg tracking-[0.25em] uppercase">IGNITE</span>
                  </div>
                  <div className="absolute inset-0 rounded-2xl overflow-hidden"><div className="absolute inset-0 animate-[shimmer_3s_ease-in-out_infinite]" /></div>
                </div>
              </motion.button>
            )}
            {phase === "idle" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} transition={{ delay: 3.5, duration: 1 }} className="mt-10 sm:mt-12">
                <span className="text-[9px] font-mono-accent text-[#6b7394]/65 tracking-[0.25em] uppercase">Press to enter</span>
              </motion.div>
            )}
          </motion.div>

          {phase === "idle" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.35 }} transition={{ delay: 4, duration: 1 }} className="absolute bottom-[8%] left-1/2 -translate-x-1/2">
              <div className="flex items-center gap-6 text-[8px] font-mono-accent text-[#6b7394]/80 tracking-[0.15em] uppercase">
                <span>Websites</span><span className="w-1 h-1 rounded-full bg-[#6b7394]/20" /><span>Chatbots</span><span className="w-1 h-1 rounded-full bg-[#6b7394]/20" /><span>AI</span><span className="w-1 h-1 rounded-full bg-[#6b7394]/20" /><span>E-Commerce</span>
              </div>
            </motion.div>
          )}

          {phase === "charging" && (
            <>
              <motion.div initial={{ scale: 0, opacity: 1 }} animate={{ scale: [0, 1.5, 2.5], opacity: [1, 0.6, 0] }} transition={{ duration: 0.4, ease: "easeIn" }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border-2 border-[#00f0ff]/60" />
              <motion.div initial={{ scale: 0, opacity: 1 }} animate={{ scale: [0, 1.2, 2], opacity: [1, 0.5, 0] }} transition={{ duration: 0.35, ease: "easeIn", delay: 0.05 }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-[#3b82f6]/50" />
              <motion.div initial={{ scale: 0, opacity: 0.8 }} animate={{ scale: [0, 1, 1.8], opacity: [0.8, 0.3, 0] }} transition={{ duration: 0.35, ease: "easeIn", delay: 0.1 }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-[#ff6b2b]/40" />
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 0.8, 1] }} transition={{ duration: 0.4 }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-[#00f0ff] to-[#3b82f6] blur-sm" />
              {[...Array(8)].map((_, i) => (
                <motion.div key={i} initial={{ opacity: 1, x: Math.cos((i / 8) * Math.PI * 2) * 200, y: Math.sin((i / 8) * Math.PI * 2) * 200 }} animate={{ x: Math.cos((i / 8) * Math.PI * 2) * 10, y: Math.sin((i / 8) * Math.PI * 2) * 10, opacity: 0 }} transition={{ duration: 0.4, ease: "easeIn" }} className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-[#00f0ff]" />
              ))}
              {[...Array(6)].map((_, i) => (
                <motion.div key={`e-${i}`} initial={{ opacity: 0.8, x: Math.cos((i / 6) * Math.PI * 2 + 0.5) * 180, y: Math.sin((i / 6) * Math.PI * 2 + 0.5) * 180 }} animate={{ x: Math.cos((i / 6) * Math.PI * 2 + 0.5) * 5, y: Math.sin((i / 6) * Math.PI * 2 + 0.5) * 5, opacity: 0 }} transition={{ duration: 0.35, ease: "easeIn" }} className="absolute top-1/2 left-1/2 w-1 h-1 rounded-full bg-[#ff6b2b]" />
              ))}
            </>
          )}

          <PortalExplosion active={phase === "exploding" || phase === "welcome"} />

          {(phase === "exploding" || phase === "welcome") && (
            <>
              <motion.div initial={{ scale: 0, opacity: 0.9 }} animate={{ scale: 80, opacity: 0 }} transition={{ duration: 1.5, ease: "easeOut" }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#00f0ff]/40" />
              <motion.div initial={{ scale: 0, opacity: 0.7 }} animate={{ scale: 55, opacity: 0 }} transition={{ duration: 1.3, ease: "easeOut", delay: 0.06 }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-[#00f0ff]/50" />
              <motion.div initial={{ scale: 0, opacity: 0.5 }} animate={{ scale: 40, opacity: 0 }} transition={{ duration: 1.1, ease: "easeOut", delay: 0.12 }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-[#3b82f6]/40" />
              <motion.div initial={{ scale: 0, opacity: 0.4 }} animate={{ scale: 30, opacity: 0 }} transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-[#ff6b2b]/35" />
            </>
          )}

          {(phase === "exploding" || phase === "welcome") && (
            <>
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div key={`ring-${i}`} initial={{ scale: 0, opacity: 0.6, rotate: i * 36 }} animate={{ scale: 50 + i * 10, opacity: 0, rotate: i * 36 + 180 }} transition={{ duration: 1.8 + i * 0.25, ease: "easeOut", delay: i * 0.1 }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2" style={{ borderRadius: "50%", border: `${2 - i * 0.3}px solid`, borderColor: i % 2 === 0 ? `rgba(0, 240, 255, ${0.4 - i * 0.07})` : `rgba(59, 130, 246, ${0.3 - i * 0.05})` }} />
              ))}
            </>
          )}

          {phase === "exploding" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 0.15, 0.8, 0.3, 0] }} transition={{ duration: 0.6, ease: "easeOut" }} className="fixed inset-0 z-[99]" style={{ background: "radial-gradient(circle at center, rgba(0,240,255,0.3) 0%, rgba(4,6,14,0.9) 70%)" }} />
          )}

          {phase === "welcome" && (
            <div className="fixed inset-0 z-[201] flex items-center justify-center">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 0.08, 0.03] }} transition={{ duration: 1.8, ease: "easeOut" }} className="absolute inset-0" style={{ background: "radial-gradient(circle at center, rgba(0,240,255,0.15) 0%, transparent 50%)" }} />

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 0.1, 0] }} transition={{ duration: 2, ease: "easeOut" }} className="absolute inset-0 grid-bg opacity-20" />

              <div className="relative z-10 flex flex-col items-center text-center">
                <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1] }} transition={{ duration: 0.5, ease: "easeOut" }} className="mb-6">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#00f0ff] to-[#3b82f6] flex items-center justify-center shadow-[0_0_60px_rgba(0,240,255,0.4),0_0_120px_rgba(0,240,255,0.15)]">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#04060e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4, ease: "easeOut" }} className="overflow-hidden">
                  <motion.h1 initial={{ y: "110%" }} animate={{ y: "0%" }} transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight">
                    <span className="text-gradient">WELCOME</span>
                  </motion.h1>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.4, ease: "easeOut" }} className="overflow-hidden mt-2 sm:mt-3">
                  <motion.div initial={{ y: "110%" }} animate={{ y: "0%" }} transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
                    <span className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight text-[#6b7394]/70">TO THE </span>
                    <span className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight text-gradient-ember">FUTURE</span>
                  </motion.div>
                </motion.div>

                <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.6, duration: 0.6, ease: "easeOut" }} className="mt-4 sm:mt-5 w-24 sm:w-32 h-px bg-gradient-to-r from-transparent via-[#00f0ff]/40 to-transparent origin-center" />

                <motion.p initial={{ opacity: 0 }} animate={{ opacity: [0, 0.5] }} transition={{ delay: 0.8, duration: 0.4 }} className="mt-3 sm:mt-4 text-[9px] sm:text-[10px] font-mono-accent tracking-[0.3em] sm:tracking-[0.4em] uppercase text-[#6b7394]/80">
                  Ember Web &bull; Digital Intelligence
                </motion.p>
              </div>

              <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ scale: [0.5, 3, 40], opacity: [0, 0.15, 0] }} transition={{ delay: 1.5, duration: 1.5, ease: "easeIn" }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#00f0ff]" />
              <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ scale: [0.5, 2.5, 35], opacity: [0, 0.1, 0] }} transition={{ delay: 1.6, duration: 1.3, ease: "easeIn" }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-[#00f0ff]/30" />
              <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ scale: [0.5, 2, 25], opacity: [0, 0.08, 0] }} transition={{ delay: 1.7, duration: 1.1, ease: "easeIn" }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-[#ff6b2b]/25" />
            </div>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}