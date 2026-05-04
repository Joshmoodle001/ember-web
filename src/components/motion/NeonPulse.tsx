"use client";

import { motion } from "framer-motion";

interface NeonPulseProps {
  children: React.ReactNode;
  color?: string;
  className?: string;
  intensity?: "subtle" | "normal" | "intense";
  onClick?: () => void;
}

export default function NeonPulse({
  children,
  color = "#00f0ff",
  className = "",
  intensity = "normal",
  onClick,
}: NeonPulseProps) {
  const intensities = {
    subtle: { blur: "8px", scale: 1.02, opacity: 0.3 },
    normal: { blur: "12px", scale: 1.04, opacity: 0.5 },
    intense: { blur: "20px", scale: 1.06, opacity: 0.7 },
  };

  const { blur, scale, opacity } = intensities[intensity];

  return (
    <div className={`relative inline-block ${className}`} onClick={onClick}>
      <motion.div
        className="absolute inset-0 rounded-lg -m-1"
        style={{
          background: color,
          filter: `blur(${blur})`,
          opacity: 0,
        }}
        animate={{
          opacity: [0, opacity, 0],
          scale: [1, scale, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute inset-0 rounded-lg -m-0.5 border"
        style={{
          borderColor: color,
          opacity: 0.5,
        }}
        animate={{
          opacity: [0.3, 0.8, 0.3],
          boxShadow: [
            `0 0 0 0 ${color}00`,
            `0 0 20px 2px ${color}40`,
            `0 0 0 0 ${color}00`,
          ],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <div className="relative">{children}</div>
    </div>
  );
}

interface BorderPulseProps {
  color?: string;
  className?: string;
  children?: React.ReactNode;
}

export function BorderPulse({
  color = "#00f0ff",
  className = "",
  children,
}: BorderPulseProps) {
  return (
    <div className={`relative ${className}`}>
      <motion.div
        className="absolute inset-0 rounded-lg"
        style={{
          border: `1px solid ${color}`,
        }}
        animate={{
          boxShadow: [
            `0 0 0 0 ${color}00`,
            `0 0 10px 1px ${color}60`,
            `0 0 20px 2px ${color}40`,
            `0 0 30px 4px ${color}20`,
            `0 0 0 0 ${color}00`,
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

interface GlowButtonProps {
  children: React.ReactNode;
  color?: string;
  className?: string;
  onClick?: () => void;
}

export function GlowButton({
  children,
  color = "#00f0ff",
  className = "",
  onClick,
}: GlowButtonProps) {
  return (
    <motion.button
      className={`relative px-6 py-3 rounded-lg font-semibold ${className}`}
      style={{ color, overflow: "hidden" }}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}20, transparent)`,
        }}
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />

      <motion.div
        className="absolute inset-0 rounded-lg"
        style={{
          boxShadow: `0 0 20px ${color}40, inset 0 0 20px ${color}20`,
        }}
        animate={{
          boxShadow: [
            `0 0 20px ${color}40, inset 0 0 20px ${color}20`,
            `0 0 40px ${color}60, inset 0 0 30px ${color}30`,
            `0 0 20px ${color}40, inset 0 0 20px ${color}20`,
          ],
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />

      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}