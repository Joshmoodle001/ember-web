"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

const CHARS = "!@#$%^&*()_+-=[]{}|;:<>?/~`\u0000";

interface GlitchTextProps {
  text: string;
  className?: string;
  as?: "span" | "h1" | "h2" | "h3" | "p" | "div";
  speed?: number;
  iterations?: number;
}

export default function GlitchText({ text, className = "", as: Tag = "span", speed = 30, iterations = 2 }: GlitchTextProps) {
  const [displayed, setDisplayed] = useState(text);
  const startedRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = useRef<any>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!isInView || startedRef.current) return;
    startedRef.current = true;

    let iteration = 0;
    const totalIterations = text.length * iterations;

    const interval = setInterval(() => {
      setDisplayed(
        text
          .split("")
          .map((char, i) => {
            if (char === " ") return " ";
            if (i < iteration / iterations) return text[i];
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join("")
      );

      iteration += 1;
      if (iteration >= totalIterations) {
        setDisplayed(text);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [isInView, text, speed, iterations]);

  const Component = Tag;
  return (
    <Component ref={ref} className={className}>
      {displayed}
    </Component>
  );
}