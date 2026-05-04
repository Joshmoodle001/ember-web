"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

export default function OnboardingAvatar({ step = 0, speaking = false, message = "" }: { step?: number; speaking?: boolean; message?: string }) {
  const [dots, setDots] = useState(() => speaking ? "" : "");

  useEffect(() => {
    if (!speaking) {
      const resetTimer = setTimeout(() => setDots(""), 0);
      return () => clearTimeout(resetTimer);
    }
    let c = 0;
    const interval = setInterval(() => { 
      c = (c + 1) % 4; 
      setDots(".".repeat(c)); 
    }, 350);
    return () => clearInterval(interval);
  }, [speaking]);

  const size = 48 + step * 8;
  const innerSize = size - 16;
  const cx = size / 2;
  const eyeY = size * 0.36;
  const leftX = size * 0.34;
  const rightX = size * 0.66;
  const mouthY = size * 0.60;

  const gradients = [
    { from: "#00f0ff", via: "#3b82f6", to: "#00e5c3", glow: "rgba(0,240,255,0.3)" },
    { from: "#3b82f6", via: "#6366f1", to: "#00f0ff", glow: "rgba(59,130,246,0.3)" },
    { from: "#00e5c3", via: "#00f0ff", to: "#3b82f6", glow: "rgba(0,229,195,0.3)" },
    { from: "#ff6b2b", via: "#f7a541", to: "#ff6b2b", glow: "rgba(255,107,43,0.3)" },
    { from: "#f7a541", via: "#ff6b2b", to: "#00f0ff", glow: "rgba(247,165,65,0.3)" },
  ];
  const g = gradients[step] || gradients[0];

  const getEyes = () => {
    switch (step) {
      case 0: return (
        <>
          <circle cx={leftX} cy={eyeY} r={2.5} fill="#04060e" />
          <circle cx={rightX} cy={eyeY} r={2.5} fill="#04060e" />
          <circle cx={leftX - 1} cy={eyeY - 1} r={1} fill="white" opacity="0.6" />
          <circle cx={rightX - 1} cy={eyeY - 1} r={1} fill="white" opacity="0.6" />
        </>
      );
      case 1: return (
        <>
          <circle cx={leftX} cy={eyeY} r={3} fill="#04060e" />
          <circle cx={rightX} cy={eyeY} r={3} fill="#04060e" />
          <circle cx={leftX + 1} cy={eyeY - 1} r={1.2} fill="white" opacity="0.7" />
          <circle cx={rightX + 1} cy={eyeY - 1} r={1.2} fill="white" opacity="0.7" />
          <path d={`M${leftX - 4} ${eyeY + 3} Q${leftX} ${eyeY + 6} ${leftX + 4} ${eyeY + 3}`} fill="none" stroke="#04060e" strokeWidth="1.5" strokeLinecap="round" />
          <path d={`M${rightX - 4} ${eyeY + 3} Q${rightX} ${eyeY + 6} ${rightX + 4} ${eyeY + 3}`} fill="none" stroke="#04060e" strokeWidth="1.5" strokeLinecap="round" />
        </>
      );
      case 2: return (
        <>
          <ellipse cx={leftX} cy={eyeY} rx={3.5} ry={4} fill="#04060e" />
          <circle cx={rightX} cy={eyeY} r={2.5} fill="#04060e" />
          <circle cx={rightX + 1.5} cy={eyeY - 1.5} r={0.8} fill="white" opacity="0.8" />
          <circle cx={leftX + 1} cy={eyeY - 1.5} r={1} fill="white" opacity="0.6" />
        </>
      );
      case 3: return (
        <>
          <path d={`M${leftX - 5} ${eyeY + 2} Q${leftX} ${eyeY - 6} ${leftX + 5} ${eyeY + 2}`} fill="none" stroke="#04060e" strokeWidth="2.5" strokeLinecap="round" />
          <path d={`M${rightX - 5} ${eyeY + 2} Q${rightX} ${eyeY - 6} ${rightX + 5} ${eyeY + 2}`} fill="none" stroke="#04060e" strokeWidth="2.5" strokeLinecap="round" />
        </>
      );
      case 4: return (
        <>
          <circle cx={leftX} cy={eyeY} r={3.5} fill="#04060e" />
          <circle cx={rightX} cy={eyeY} r={3.5} fill="#04060e" />
          <motion.circle cx={leftX} cy={eyeY - 3} r={2.5} fill="white" opacity="0.4"
            animate={{ opacity: [0.4, 0.7, 0.4], r: [2.5, 1.5, 2.5] }}
            transition={{ duration: 1.5, repeat: Infinity }} />
          <motion.circle cx={rightX} cy={eyeY - 3} r={2.5} fill="white" opacity="0.4"
            animate={{ opacity: [0.4, 0.7, 0.4], r: [2.5, 1.5, 2.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }} />
          <circle cx={leftX - 1} cy={eyeY + 1} r={1.2} fill="white" opacity="0.5" />
          <circle cx={rightX - 1} cy={eyeY + 1} r={1.2} fill="white" opacity="0.5" />
        </>
      );
      default: return <circle cx={cx} cy={eyeY} r={3} fill="#04060e" />;
    }
  };

  const getMouth = () => {
    switch (step) {
      case 0: return <path d={`M${cx - 6} ${mouthY} Q${cx} ${mouthY + 6} ${cx + 6} ${mouthY}`} fill="none" stroke="#04060e" strokeWidth="2" strokeLinecap="round" />;
      case 1: return <ellipse cx={cx} cy={mouthY + 2} rx={5} ry={4} fill="#04060e" />;
      case 2: return <path d={`M${cx - 5} ${mouthY} Q${cx} ${mouthY + 7} ${cx + 5} ${mouthY}`} fill="none" stroke="#04060e" strokeWidth="2" strokeLinecap="round" />;
      case 3: return <path d={`M${cx - 6} ${mouthY} Q${cx - 2} ${mouthY + 5} ${cx} ${mouthY} Q${cx + 2} ${mouthY + 5} ${cx + 6} ${mouthY}`} fill="none" stroke="#04060e" strokeWidth="1.5" strokeLinecap="round" />;
      case 4: return <path d={`M${cx - 7} ${mouthY - 1} Q${cx} ${mouthY + 10} ${cx + 7} ${mouthY - 1}`} fill="#04060e" stroke="#04060e" strokeWidth="1" />;
      default: return null;
    }
  };

  const getAccessories = () => {
    switch (step) {
      case 0: return null;
      case 1: return (
        <>
          <motion.g animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 2, repeat: Infinity }}>
            <circle cx={leftX + 8} cy={eyeY - 8} r={2} fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.5" />
            <line x1={leftX + 10} y1={eyeY - 6} x2={leftX + 13} y2={eyeY - 3} stroke="#3b82f6" strokeWidth="1" opacity="0.3" />
          </motion.g>
        </>
      );
      case 2: return (
        <>
          <motion.circle cx={size * 0.15} cy={size * 0.8} r={2} fill="#00e5c3" opacity={0.5}
            animate={{ y: [0, -5, 0], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }} />
          <motion.circle cx={size * 0.85} cy={size * 0.2} r={1.5} fill="#00f0ff" opacity={0.4}
            animate={{ y: [0, -8, 0], opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }} />
          <motion.circle cx={size * 0.9} cy={size * 0.7} r={1} fill="#3b82f6" opacity={0.3}
            animate={{ y: [0, -6, 0], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 3, repeat: Infinity, delay: 1 }} />
        </>
      );
      case 3: return (
        <>
          <motion.path d={`M${size * 0.18} ${size * 0.18} L${size * 0.3} ${size * 0.12} L${size * 0.5} ${size * 0.25}`}
            fill="none" stroke="#f7a541" strokeWidth="1.5" opacity="0.4"
            animate={{ pathLength: [0, 1], opacity: [0.1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }} />
          <motion.path d={`M${size * 0.7} ${size * 0.1} L${size * 0.82} ${size * 0.22} L${size * 0.95} ${size * 0.15}`}
            fill="none" stroke="#ff6b2b" strokeWidth="1.5" opacity="0.3"
            animate={{ pathLength: [0, 1], opacity: [0.1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} />
          {[...Array(3)].map((_, i) => (
            <motion.circle key={i}
              cx={size * (0.8 + Math.random() * 0.15)}
              cy={size * (0.1 + i * 0.15)}
              r={1 + Math.random()}
              fill={i % 2 === 0 ? "#ff6b2b" : "#f7a541"}
              animate={{ opacity: [0, 0.6, 0], y: [0, -15, -30], scale: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.7 }}
            />
          ))}
        </>
      );
      case 4: return (
        <>
          <motion.g animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
            <polygon points={`${cx},${size * 0.02} ${cx - 4},${size * 0.1} ${cx + 4},${size * 0.1}`} fill="#f7a541" opacity="0.7" />
            <polygon points={`${cx - 4},${size * 0.05} ${cx - 7},${size * 0.02} ${cx - 5},${size * 0.08}`} fill="#ff6b2b" opacity="0.5" />
            <polygon points={`${cx + 4},${size * 0.05} ${cx + 7},${size * 0.02} ${cx + 5},${size * 0.08}`} fill="#ff6b2b" opacity="0.5" />
          </motion.g>
          {[...Array(5)].map((_, i) => (
            <motion.circle key={i}
              cx={cx + (i - 2) * 6}
              cy={size * 0.15}
              r={1.5 - i * 0.2 + Math.abs(i - 2) * 0.1}
              fill={i === 2 ? "#f7a541" : "#00f0ff"}
              animate={{ y: [0, -8 - i * 2, 0], opacity: [0.2, 0.7, 0.2] }}
              transition={{ duration: 1.5 + i * 0.2, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </>
      );
      default: return null;
    }
  };

  const ringColors = [
    "rgba(0,240,255,0.15)",
    "rgba(59,130,246,0.15)",
    "rgba(0,229,195,0.15)",
    "rgba(255,107,43,0.2)",
    "rgba(247,165,65,0.2)",
  ];

  return (
    <div className="flex flex-col items-center">
      <motion.div
        animate={{
          y: [0, -step === 4 ? 12 : 8, 0],
          scale: step === 4 ? [1, 1.05, 1] : [1, 1.02, 1],
        }}
        transition={{ duration: step === 4 ? 2 : 3, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
        key={step}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={`${step}-${i}`}
            className="absolute rounded-full"
            style={{
              inset: `${-8 - i * 6}px`,
              border: `1px solid ${ringColors[step]}`,
              opacity: 0,
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 0.3 - i * 0.1, scale: 1 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          />
        ))}

        {speaking && (
          <motion.div
            className="absolute -inset-2 rounded-2xl"
            style={{ background: `radial-gradient(circle, ${g.glow}, transparent 70%)` }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}

        <motion.div
          className="relative rounded-2xl flex items-center justify-center overflow-hidden"
          style={{
            width: size,
            height: size,
            background: `linear-gradient(135deg, ${g.from}, ${g.via}, ${g.to})`,
            boxShadow: `0 0 ${20 + step * 10}px ${g.glow}, 0 0 ${40 + step * 15}px ${ringColors[step]}`,
          }}
          initial={{ scale: 0.5, rotate: -10 }}
          animate={{ scale: 1, rotate: step === 3 ? [0, 5, -5, 0] : step === 4 ? [0, -3, 3, 0] : 0 }}
          transition={step === 3 || step === 4 ? { duration: 0.5 } : { duration: 0.4, ease: "easeOut" }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent" />

          {step >= 2 && (
            <motion.div
              className="absolute inset-0 opacity-20"
              style={{ background: `radial-gradient(circle at 30% 30%, ${g.from}, transparent 60%)` }}
              animate={{ opacity: [0.1, 0.25, 0.1] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          )}

          <svg width={innerSize} height={innerSize} viewBox={`0 0 ${size} ${size}`} className="relative z-10">
            {getEyes()}
            {getMouth()}
            {getAccessories()}
          </svg>
        </motion.div>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={message}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.3 }}
          className="mt-3 text-center max-w-[260px] sm:max-w-xs"
        >
          {message && (
            <p className="text-xs sm:text-sm text-[#a0a0b0]/80 font-body leading-relaxed">
              {message}{speaking ? dots : ""}
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}