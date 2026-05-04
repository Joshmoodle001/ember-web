"use client";

import { motion, useScroll, useSpring, useTransform } from "framer-motion";

export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const glowOpacity = useTransform(scrollYProgress, [0, 0.1, 0.9, 1], [0, 1, 1, 0]);

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 right-0 z-[60] h-[2px] origin-left"
        style={{
          scaleX,
          background: "linear-gradient(90deg, #00f0ff 0%, #3b82f6 40%, #00e5c3 70%, #00f0ff 100%)",
          boxShadow: "0 0 12px rgba(0, 240, 255, 0.6), 0 0 40px rgba(0, 240, 255, 0.2)",
        }}
      />
      <motion.div
        className="fixed top-0 left-0 right-0 z-[59] h-[6px] origin-left"
        style={{
          scaleX,
          background: "linear-gradient(90deg, rgba(0,240,255,0.15), rgba(59,130,246,0.1), rgba(0,229,195,0.15))",
          opacity: glowOpacity,
        }}
      />
      <motion.div
        className="fixed top-[2px] z-[61] w-2 h-2 rounded-full"
        style={{
          left: useTransform(scrollYProgress, (v) => `${v * 100}%`),
          background: "#fff",
          boxShadow: "0 0 8px #00f0ff, 0 0 20px #00f0ff, 0 0 40px rgba(0,240,255,0.3)",
          opacity: useTransform(scrollYProgress, [0, 0.02], [0, 1]),
        }}
      />
    </>
  );
}