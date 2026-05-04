"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { motion } from "framer-motion";

interface MatrixRainProps {
  className?: string;
  opacity?: number;
  speed?: number;
  color?: string;
  charSet?: string;
}

export default function MatrixRain({
  className = "",
  opacity = 0.15,
  speed = 100,
  color = "#00f0ff",
  charSet = "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン",
}: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const chars = charSet.split("");
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = Array(columns).fill(1);
    const colors = [color, `${color}cc`, `${color}99`, `${color}66`];

    let intervalId: NodeJS.Timeout;

    const draw = () => {
      ctx.fillStyle = "rgba(4, 6, 14, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = color;
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const opacityValue = Math.random() * opacity;
        
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        ctx.globalAlpha = opacityValue;
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      ctx.globalAlpha = 1;
      intervalId = setTimeout(draw, speed);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      clearTimeout(intervalId);
    };
  }, [isVisible, charSet, color, speed, opacity]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ opacity: isVisible ? 1 : 0, transition: "opacity 0.5s" }}
    />
  );
}

interface DigitalStreamProps {
  className?: string;
  intensity?: number;
}

export function DigitalStream({ className = "", intensity = 5 }: DigitalStreamProps) {
  const streams = useMemo(() => {
    const s: { id: number; speed: number; delay: number; y: number }[] = [];
    for (let i = 0; i < intensity; i++) {
      // eslint-disable-next-line react-hooks/purity
      s.push({ id: i, speed: Math.random() * 2 + 1, delay: Math.random() * 5, y: Math.random() * 100 });
    }
    return s;
  }, [intensity]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {streams.map((stream) => (
        <motion.div
          key={stream.id}
          className="absolute w-[1px] bg-gradient-to-b from-transparent via-[#00f0ff]/50 to-transparent"
          style={{
            left: `${stream.id * (100 / intensity)}%`,
          }}
          animate={{
            y: ["-100%", "200%"],
          }}
          transition={{
            duration: stream.speed * 10,
            repeat: Infinity,
            delay: stream.delay,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}