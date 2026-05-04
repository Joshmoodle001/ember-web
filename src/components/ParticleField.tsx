"use client";

import { useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  isEmber: boolean;
  life: number;
}

export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef<number>(0);
  const animateRef = useRef<() => void>(() => {});

  const init = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = (canvas.width = window.innerWidth);
    const h = (canvas.height = window.innerHeight);
    const isMobile = w < 768;
    const isTablet = w < 1024;
    const count = isMobile ? 20 : isTablet ? 40 : Math.min(Math.floor((w * h) / 12000), 100);

    canvas.dataset.mobile = isMobile ? "1" : "0";

    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 2 + 0.3,
      opacity: Math.random() * 0.4 + 0.05,
      isEmber: Math.random() > 0.75,
      life: Math.random() * 100,
    }));
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const mouse = mouseRef.current;
    const particles = particlesRef.current;

    ctx.clearRect(0, 0, w, h);

    particles.forEach((p) => {
      p.life += 0.3;
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      const dx = mouse.x - p.x;
      const dy = mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 200) {
        const force = (200 - dist) / 200;
        p.vx += (dx / dist) * force * 0.008;
        p.vy += (dy / dist) * force * 0.008;
      }

      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > 1.5) {
        p.vx = (p.vx / speed) * 1.5;
        p.vy = (p.vy / speed) * 1.5;
      }

      p.vx *= 0.999;
      p.vy *= 0.999;

      const pulse = Math.sin(p.life * 0.03) * 0.3 + 0.7;
      const alpha = p.opacity * pulse;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.isEmber
        ? `rgba(255, 107, 43, ${alpha})`
        : `rgba(245, 240, 235, ${alpha * 0.3})`;
      ctx.fill();
    });

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = canvasRef.current?.dataset.mobile === "1" ? 60 : 100;

        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.08;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = particles[i].isEmber || particles[j].isEmber
            ? `rgba(255, 107, 43, ${alpha})`
            : `rgba(245, 240, 235, ${alpha * 0.3})`;
          ctx.lineWidth = 0.4;
          ctx.stroke();
        }
      }
    }

    frameRef.current = requestAnimationFrame(animateRef.current);
  }, []);

  useEffect(() => {
    animateRef.current = animate;
  }, [animate]);

  useEffect(() => {
    if (canvasRef.current) {
      init(canvasRef.current);
      animateRef.current();
    }
  }, [init, animate]);

  return (
    <motion.canvas
      ref={canvasRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 3 }}
      className="absolute inset-0 pointer-events-none"
      onMouseMove={(e) => {
        mouseRef.current = { x: e.clientX, y: e.clientY };
      }}
    />
  );
}