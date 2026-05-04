"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";

interface ParallaxImageProps {
  src: string;
  alt: string;
  className?: string;
  overlay?: string;
}

export default function ParallaxImage({
  src,
  alt,
  className = "",
  overlay = "rgba(3,3,5,0.4)",
}: ParallaxImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["-15%", "15%"]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.1, 1, 1.1]);

  return (
    <div ref={ref} className={`overflow-hidden relative ${className}`}>
      <motion.div
        style={{ y, scale }}
        className="absolute inset-[-15%] bg-cover bg-center"
      >
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          loading="lazy"
        />
      </motion.div>
      <div
        className="absolute inset-0 z-10"
        style={{ background: overlay }}
      />
    </div>
  );
}