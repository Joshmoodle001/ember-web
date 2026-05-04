"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
}

export default function EmberTrail() {
  const [isDesktop] = useState(() => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  const [particles, setParticles] = useState<Particle[]>([]);
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const springX = useSpring(cursorX, { stiffness: 300, damping: 28 });
  const springY = useSpring(cursorY, { stiffness: 300, damping: 28 });
  const particleIdRef = useRef(0);
  const lastPosRef = useRef({ x: -100, y: -100 });
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);

      const dx = e.clientX - lastPosRef.current.x;
      const dy = e.clientY - lastPosRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 10) {
        const newParticles: Particle[] = [];
        const count = Math.min(Math.floor(dist / 15), 4);

        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 2 + 1;
          newParticles.push({
            id: particleIdRef.current++,
            x: e.clientX - dx * (i / count),
            y: e.clientY - dy * (i / count),
            vx: Math.cos(angle) * speed * 0.3,
            vy: Math.sin(angle) * speed * 0.3 - 0.5,
            life: 1,
            size: Math.random() * 4 + 2,
          });
        }

        setParticles((prev) => [...prev.slice(-40), ...newParticles]);
        lastPosRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [cursorX, cursorY]);

  useEffect(() => {
    const animate = () => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.02,
            life: p.life - 0.025,
          }))
          .filter((p) => p.life > 0)
      );
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  if (!isDesktop) return null;

  return (
    <>
      <motion.div
        className="fixed pointer-events-none z-[35] mix-blend-screen"
        style={{
          x: springX,
          y: springY,
          translateX: "-50%",
          translateY: "-50%",
        }}
      >
        <div className="w-[300px] h-[300px] rounded-full bg-ember/[0.03] blur-[60px]" />
      </motion.div>

      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="fixed pointer-events-none rounded-full"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            background: `rgba(255, ${107 + Math.floor(p.life * 50)}, ${43 + Math.floor(p.life * 100)}, ${p.life * 0.8})`,
            boxShadow: `0 0 ${p.size * 2}px rgba(255, 107, 43, ${p.life * 0.5})`,
          }}
          initial={{ opacity: p.life, scale: 0.5 }}
          animate={{ opacity: p.life, scale: p.life }}
        />
      ))}
    </>
  );
}