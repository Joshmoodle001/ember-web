"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

interface FloatingShapesProps {
  variant?: "ember" | "solar" | "mixed";
}



export default function FloatingShapes({ variant = "ember" }: FloatingShapesProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const rotate1 = useTransform(scrollYProgress, [0, 1], [0, 45]);
  const rotate2 = useTransform(scrollYProgress, [0, 1], [0, -30]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);

  const colorMap = {
    ember: { primary: "rgba(255, 107, 43, 0.06)", secondary: "rgba(247, 165, 65, 0.04)" },
    solar: { primary: "rgba(247, 165, 65, 0.06)", secondary: "rgba(255, 107, 43, 0.04)" },
    mixed: { primary: "rgba(255, 107, 43, 0.05)", secondary: "rgba(245, 240, 235, 0.02)" },
  };

  const colors = colorMap[variant];

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div style={{ y: y1, rotate: rotate1, opacity }} className="absolute top-[20%] left-[10%]">
        <div
          className="w-48 h-48 md:w-72 md:h-72 rounded-full blur-[60px] md:blur-[80px]"
          style={{ background: colors.primary }}
        />
      </motion.div>

      <motion.div style={{ y: y2, rotate: rotate2, opacity }} className="absolute top-[40%] right-[8%]">
        <div
          className="w-48 h-48 rounded-full border border-ember/10"
          style={{ background: "transparent" }}
        />
      </motion.div>

      <motion.div style={{ y: y3, opacity }} className="absolute bottom-[25%] right-[15%]">
        <div className="grid grid-cols-5 gap-3 opacity-30">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-ember/40" />
          ))}
        </div>
      </motion.div>

      <motion.div style={{ y: y2, opacity }} className="absolute bottom-[10%] left-[20%]">
        <div
          className="w-56 h-56 rounded-full blur-[60px]"
          style={{ background: colors.secondary }}
        />
      </motion.div>

      <motion.div style={{ y: y1, rotate: rotate2, opacity }} className="absolute top-[60%] left-[50%]">
        <div className="w-40 h-40 rounded-full border border-white/[0.03]" />
      </motion.div>
    </div>
  );
}