"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

interface EnergyPulseProps {
  children: React.ReactNode;
  color?: string;
  intensity?: "subtle" | "low" | "medium" | "high";
  className?: string;
}

export default function EnergyPulse({
  children,
  color = "#00f0ff",
  intensity = "medium",
  className = "",
}: EnergyPulseProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      {isInView && (
        <div className="absolute inset-0 -m-4 pointer-events-none">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              border: `1px solid ${color}`,
              opacity: 0.3,
            }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{
              scale: [0.5, 1.5],
              opacity: [0.3, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              border: `1px solid ${color}`,
              opacity: 0.2,
            }}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{
              scale: [0.3, 1.8],
              opacity: [0.2, 0],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              delay: 0.5,
              ease: "easeOut",
            }}
          />
        </div>
      )}
      {children}
    </div>
  );
}

interface ScrollPulseProps {
  className?: string;
  color?: string;
  children?: React.ReactNode;
}

export function ScrollPulse({ className = "", color = "#00f0ff", children }: ScrollPulseProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.3 });

  return (
    <div ref={ref} className={`relative ${className}`}>
      {isInView && (
        <>
          <motion.div
            className="absolute rounded-full"
            style={{
              border: `2px solid ${color}`,
              boxShadow: `0 0 20px ${color}40`,
            }}
            initial={{ width: "100%", height: "100%", opacity: 0.8 }}
            animate={{
              width: ["100%", "150%"],
              height: ["100%", "150%"],
              opacity: [0.8, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
          <motion.div
            className="absolute rounded-full"
            style={{
              border: `1px solid ${color}`,
              boxShadow: `0 0 10px ${color}30`,
            }}
            initial={{ width: "100%", height: "100%", opacity: 0.5 }}
            animate={{
              width: ["100%", "180%"],
              height: ["100%", "180%"],
              opacity: [0.5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: 0.3,
              ease: "easeOut",
            }}
          />
        </>
      )}
      {children}
    </div>
  );
}

interface ExpandingRingsProps {
  count?: number;
  color?: string;
  className?: string;
}

export function ExpandingRings({
  count = 3,
  color = "#00f0ff",
  className = "",
}: ExpandingRingsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  return (
    <div ref={ref} className={`relative inline-flex items-center justify-center ${className}`}>
      {isInView &&
        Array.from({ length: count }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              border: `1px solid ${color}`,
            }}
            initial={{ width: "20%", height: "20%", opacity: 0.6 }}
            animate={{
              width: ["20%", "200%"],
              height: ["20%", "200%"],
              opacity: [0.6, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.4,
              ease: "easeOut",
            }}
          />
        ))}
    </div>
  );
}