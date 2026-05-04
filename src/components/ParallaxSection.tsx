"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

interface ParallaxSectionProps {
  children: React.ReactNode;
  className?: string;
  bgImage?: string;
  bgOverlay?: string;
}

export default function ParallaxSection({
  children,
  className = "",
  bgImage,
  bgOverlay = "linear-gradient(180deg, rgba(3,3,5,0.95) 0%, rgba(3,3,5,0.8) 50%, rgba(3,3,5,0.95) 100%)",
}: ParallaxSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const bgY = useTransform(scrollYProgress, [0, 1], ["-20%", "20%"]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      {bgImage && (
        <motion.div
          style={{ y: bgY }}
          className="absolute inset-0 z-0"
        >
          <div
            className="absolute inset-[-20%] bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${bgImage})` }}
          />
          <div
            className="absolute inset-0"
            style={{ background: bgOverlay }}
          />
        </motion.div>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}