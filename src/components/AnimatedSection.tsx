"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import EnergyPulse from "./motion/EnergyPulse";

type AnimationVariant = "fadeUp" | "fadeDown" | "fadeLeft" | "fadeRight" | "scaleUp" | "clipLeft" | "clipRight" | "clipUp" | "clipCenter" | "slideBlur";

export type { AnimationVariant };

const variants: Record<AnimationVariant, { hidden: Record<string, string | number>; visible: Record<string, string | number> }> = {
  fadeUp: {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  },
  fadeDown: {
    hidden: { opacity: 0, y: -30 },
    visible: { opacity: 1, y: 0 },
  },
  fadeLeft: {
    hidden: { opacity: 0, x: -40 },
    visible: { opacity: 1, x: 0 },
  },
  fadeRight: {
    hidden: { opacity: 0, x: 40 },
    visible: { opacity: 1, x: 0 },
  },
  scaleUp: {
    hidden: { opacity: 0, scale: 0.85 },
    visible: { opacity: 1, scale: 1 },
  },
  clipLeft: {
    hidden: { clipPath: "inset(0 100% 0 0)", opacity: 0 },
    visible: { clipPath: "inset(0 0% 0 0)", opacity: 1 },
  },
  clipRight: {
    hidden: { clipPath: "inset(0 0 0 100%)", opacity: 0 },
    visible: { clipPath: "inset(0 0 0 0%)", opacity: 1 },
  },
  clipUp: {
    hidden: { clipPath: "inset(100% 0 0 0)", opacity: 0 },
    visible: { clipPath: "inset(0% 0 0 0)", opacity: 1 },
  },
  clipCenter: {
    hidden: { clipPath: "inset(50% 50% 50% 50%)", opacity: 0 },
    visible: { clipPath: "inset(0% 0% 0% 0%)", opacity: 1 },
  },
  slideBlur: {
    hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)" },
  },
};

interface Props {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  variant?: AnimationVariant;
  duration?: number;
}

export default function AnimatedSection({ children, className = "", delay = 0, variant = "fadeUp", duration = 0.6 }: Props) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const v = variants[variant];

  return (
    <motion.div
      ref={ref}
      initial={v.hidden}
      animate={isInView ? v.visible : v.hidden}
      transition={{ duration, delay, ease: [0.23, 1, 0.32, 1] }}
      className={className}
    >
      <EnergyPulse color="#00f0ff" intensity="subtle">
        {children}
      </EnergyPulse>
    </motion.div>
  );
}