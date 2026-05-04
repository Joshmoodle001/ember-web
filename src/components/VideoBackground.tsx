"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";

function getNetworkStatus() {
  const nav = navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } } | null;
  return nav?.connection;
}

interface VideoBackgroundProps {
  src: string;
  poster?: string;
  overlay?: string;
  className?: string;
  opacity?: number;
  blur?: number;
  playbackRate?: number;
}

export default function VideoBackground({
  src,
  poster,
  overlay = "linear-gradient(180deg, rgba(3,3,5,0.92) 0%, rgba(3,3,5,0.7) 40%, rgba(3,3,5,0.75) 60%, rgba(3,3,5,0.95) 100%)",
  className = "",
  opacity = 0.15,
  blur = 2,
  playbackRate = 0.7,
}: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoad] = useState(() => {
    if (typeof window === "undefined") return false;
    const conn = getNetworkStatus();
    const isSlowConnection = conn ? conn.saveData || conn.effectiveType === "2g" : false;
    const isMobile = window.innerWidth < 768;
    return !isSlowConnection && !isMobile;
  });

  useEffect(() => {
    if (!shouldLoad || !videoRef.current) return;
    const video = videoRef.current;
    video.playbackRate = playbackRate;
    video.play().catch(() => {});
  }, [shouldLoad, playbackRate]);

  if (!shouldLoad) {
    return (
      <div className={`absolute inset-0 overflow-hidden ${className}`}>
        <div className="absolute inset-0" style={{ background: overlay }} />
      </div>
    );
  }

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <motion.video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        poster={poster}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity, filter: blur > 0 ? `blur(${blur}px)` : "none" }}
        initial={{ opacity: 0 }}
        animate={{ opacity }}
        transition={{ duration: 2, ease: "easeOut" }}
      >
        <source src={src} type="video/mp4" />
      </motion.video>
      <div className="absolute inset-0" style={{ background: overlay }} />
    </div>
  );
}