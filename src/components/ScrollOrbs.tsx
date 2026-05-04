"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export default function ScrollOrbs() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -350]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, -150]);
  const y4 = useTransform(scrollYProgress, [0, 1], [0, -280]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 0.6, 0.6, 0]);

  return (
    <div ref={containerRef} className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
      <motion.div style={{ y: y1, opacity }} className="absolute top-[15%] -left-[10%] w-[300px] h-[300px] md:w-[500px] md:h-[500px] rounded-full bg-[#00f0ff]/[0.02] blur-[100px] md:blur-[150px]" />
      <motion.div style={{ y: y2, opacity }} className="absolute top-[55%] -right-[10%] w-[250px] h-[250px] md:w-[400px] md:h-[400px] rounded-full bg-[#3b82f6]/[0.03] blur-[80px] md:blur-[120px]" />
      <motion.div style={{ y: y3, opacity }} className="absolute top-[35%] left-[40%] w-[200px] h-[200px] md:w-[350px] md:h-[350px] rounded-full bg-[#00e5c3]/[0.015] blur-[80px] md:blur-[100px]" />
      <motion.div style={{ y: y4, opacity }} className="absolute top-[75%] left-[15%] w-[180px] h-[180px] md:w-[300px] md:h-[300px] rounded-full bg-[#3b82f6]/[0.02] blur-[60px] md:blur-[100px]" />
    </div>
  );
}