"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export default function ScanlineOverlay() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const scanY = useTransform(scrollYProgress, [0, 1], ["-100%", "200%"]);
  const lineOpacity = useTransform(scrollYProgress, [0, 0.1, 0.9, 1], [0, 0.03, 0.03, 0]);

  return (
    <div ref={ref} className="fixed inset-0 pointer-events-none z-[2]">
      <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,240,255,0.03) 2px, rgba(0,240,255,0.03) 4px)" }} />
      <motion.div
        style={{ y: scanY, opacity: lineOpacity }}
        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00f0ff]/40 to-transparent"
      />
    </div>
  );
}