"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Image from "next/image";

interface ScrollRevealImageProps {
  src: string;
  alt: string;
  className?: string;
  from?: "left" | "right" | "bottom";
}

export default function ScrollRevealImage({
  src,
  alt,
  className = "",
  from = "left",
}: ScrollRevealImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const initialX = from === "left" ? "-10%" : from === "right" ? "10%" : "0%";
  const x = useTransform(scrollYProgress, [0, 0.5, 1], [initialX, "0%", initialX]);
  const scale = useTransform(scrollYProgress, [0, 0.4, 0.6, 1], [1.2, 1, 1, 1.2]);
  const imageScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.3, 1.05, 1.3]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);

  return (
    <div ref={ref} className={`overflow-hidden relative ${className}`}>
      <motion.div style={{ x, scale, opacity }} className="relative w-full h-full">
        <motion.div style={{ scale: imageScale }} className="w-full h-full relative">
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover"
            loading="lazy"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#030305] via-transparent to-transparent opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#030305]/40 via-transparent to-[#030305]/40" />
      </motion.div>
    </div>
  );
}