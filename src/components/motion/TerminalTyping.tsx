"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface TerminalTypingProps {
  text: string;
  className?: string;
  speed?: number;
  cursorColor?: string;
}

export default function TerminalTyping({
  text,
  className = "",
  speed = 50,
  cursorColor = "#00f0ff",
}: TerminalTypingProps) {
  const [displayText, setDisplayText] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index <= text.length) {
        setDisplayText(text.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);
    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <span className={`inline-block ${className}`}>
      {displayText}
      <motion.span
        className="inline-block w-[0.6em] h-[1.1em] ml-[2px] align-middle"
        style={{ backgroundColor: cursorColor }}
        animate={{ opacity: showCursor ? 1 : 0 }}
      />
    </span>
  );
}

interface TypewriterProps {
  phrases: string[];
  className?: string;
  typingSpeed?: number;
  pauseDuration?: number;
}

export function Typewriter({
  phrases,
  className = "",
  typingSpeed = 50,
  pauseDuration = 2000,
}: TypewriterProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (charIndex < phrases[phraseIndex].length) {
      const timeout = setTimeout(() => {
        setCharIndex((prev) => prev + 1);
      }, typingSpeed);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => {
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
        setCharIndex(0);
      }, pauseDuration);
      return () => clearTimeout(timeout);
    }
  }, [charIndex, phraseIndex, phrases, typingSpeed, pauseDuration]);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className={`inline ${className}`}>
      {phrases[phraseIndex].slice(0, charIndex)}
      <motion.span
        className="inline-block w-[2px] h-[1em] ml-[2px] align-middle bg-[#00f0ff]"
        animate={{ opacity: showCursor ? 1 : 0 }}
      />
    </span>
  );
}