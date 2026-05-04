"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

interface ClipRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "left" | "right" | "up" | "down" | "center";
}

const clipVariants = {
  left: {
    hidden: { clipPath: "inset(0 100% 0 0)" },
    visible: { clipPath: "inset(0 0% 0 0)" },
  },
  right: {
    hidden: { clipPath: "inset(0 0 0 100%)" },
    visible: { clipPath: "inset(0 0 0 0%)" },
  },
  up: {
    hidden: { clipPath: "inset(100% 0 0 0)" },
    visible: { clipPath: "inset(0% 0 0 0)" },
  },
  down: {
    hidden: { clipPath: "inset(0 0 100% 0)" },
    visible: { clipPath: "inset(0 0 0% 0)" },
  },
  center: {
    hidden: { clipPath: "inset(50% 50% 50% 50%)" },
    visible: { clipPath: "inset(0% 0% 0% 0%)" },
  },
};

export default function ClipReveal({ children, className = "", delay = 0, direction = "left" }: ClipRevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={clipVariants[direction]}
      transition={{ duration: 0.8, delay, ease: [0.23, 1, 0.32, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}