"use client";

import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";

interface HolographicCardProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
}

export default function HolographicCard({
  children,
  className = "",
  color = "#00f0ff",
}: HolographicCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-0.5, 0.5], [15, -15]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-15, 15]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) / rect.width);
    y.set((e.clientY - centerY) / rect.height);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={`relative ${className}`}
      style={{
        perspective: 1000,
        transformStyle: "preserve-3d",
      }}
      onMouseMove={(e) => {
        setIsHovered(true);
        handleMouseMove(e);
      }}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        style={{
          rotateX: isHovered ? rotateX : 0,
          rotateY: isHovered ? rotateY : 0,
          transformStyle: "preserve-3d",
        }}
        className="relative"
      >
        <div
          className="absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300"
          style={{
            background: `linear-gradient(135deg, 
              ${color}30 0%, 
              transparent 30%, 
              ${color}20 50%, 
              transparent 70%, 
              ${color}30 100%)`,
            filter: "blur(20px)",
            transform: "translateZ(-10px)",
          }}
        />

        <div className="relative">
          {children}
        </div>

        {isHovered && (
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              background: `linear-gradient(135deg, 
                ${color}40 0%, 
                transparent 40%, 
                ${color}20 60%, 
                ${color}40 100%)`,
              mixBlendMode: "overlay",
            }}
          />
        )}
      </motion.div>

      <motion.div
        className="absolute -inset-px rounded-xl pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${color}, transparent 50%, ${color})`,
          opacity: isHovered ? 0.5 : 0.2,
        }}
        animate={{
          opacity: isHovered ? [0.3, 0.6, 0.3] : 0.2,
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
        }}
      />
    </motion.div>
  );
}

interface FlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  className?: string;
}

export function FlipCard({ front, back, className = "" }: FlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className={`relative w-full h-full cursor-pointer ${className}`}
      style={{ perspective: 1000 }}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <motion.div
        className="w-full h-full relative"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      >
        <div
          className="absolute inset-0 backface-hidden"
          style={{ backfaceVisibility: "hidden" }}
        >
          {front}
        </div>
        <div
          className="absolute inset-0 backface-hidden"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {back}
        </div>
      </motion.div>
    </div>
  );
}