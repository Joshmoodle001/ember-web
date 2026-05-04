"use client";

import { useRef, useMemo } from "react";
import { motion, useInView } from "framer-motion";

interface CircuitTraceProps {
  points: { x: number; y: number }[];
  color?: string;
  className?: string;
  animated?: boolean;
}

export default function CircuitTrace({
  points,
  color = "#00f0ff",
  className = "",
  animated = true,
}: CircuitTraceProps) {
  const ref = useRef<SVGPathElement>(null);
  const isInView = useInView(ref, { once: true });

  if (points.length < 2) return null;

  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;
    pathD += ` Q ${prev.x} ${prev.y} ${midX} ${midY}`;
    if (i === points.length - 1) {
      pathD += ` L ${curr.x} ${curr.y}`;
    }
  }

  return (
    <svg className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}>
      <motion.path
        ref={ref}
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1"
        strokeDasharray="4 4"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={
          animated && isInView
            ? { pathLength: 1, opacity: 0.6 }
            : { pathLength: 1, opacity: 0.3 }
        }
        transition={{ duration: 2, ease: "easeInOut" }}
      />

      {animated &&
        isInView &&
        points.map((point, i) => (
          <motion.circle
            key={i}
            cx={point.x}
            cy={point.y}
            r="3"
            fill={color}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          />
        ))}
    </svg>
  );
}

interface CircuitNodeProps {
  x: string | number;
  y: string | number;
  color?: string;
  size?: number;
  pulse?: boolean;
}

export function CircuitNode({
  x,
  y,
  color = "#00f0ff",
  size = 4,
  pulse = true,
}: CircuitNodeProps) {
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        backgroundColor: color,
        transform: "translate(-50%, -50%)",
        boxShadow: `0 0 ${size * 2}px ${color}`,
      }}
      animate={
        pulse
          ? {
              boxShadow: [
                `0 0 ${size * 2}px ${color}`,
                `0 0 ${size * 4}px ${color}`,
                `0 0 ${size * 2}px ${color}`,
              ],
            }
          : {}
      }
      transition={{
        duration: 1.5,
        repeat: Infinity,
      }}
    />
  );
}

interface CircuitBoardProps {
  className?: string;
  nodes?: number;
}

export function CircuitBoard({ className = "", nodes = 8 }: CircuitBoardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  const nodePositions = useMemo(() => {
    const positions: { x: number; y: number }[] = [];
    for (let i = 0; i < nodes; i++) {
      // eslint-disable-next-line react-hooks/purity
      positions.push({ x: Math.random() * 100, y: Math.random() * 100 });
    }
    return positions;
  }, [nodes]);

  return (
    <div ref={ref} className={`relative w-full h-full ${className}`}>
      {isInView && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {nodePositions.map((start, i) =>
            nodePositions
              .slice(i + 1)
              .filter(() => Math.random() > 0.5)
              .slice(0, 2)
              .map((end, j) => (
                <motion.path
                  key={`${i}-${j}`}
                  d={`M ${start.x}% ${start.y}% Q ${
                    (start.x + end.x) / 2
                  }% ${start.y}% ${end.x}% ${end.y}%`}
                  fill="none"
                  stroke="#00f0ff"
                  strokeWidth="0.5"
                  strokeDasharray="2 2"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.3 }}
                  transition={{ duration: 1.5, delay: i * 0.1 }}
                />
              ))
          )}
        </svg>
      )}

      {isInView &&
        nodePositions.map((pos, i) => (
          <CircuitNode key={i} x={`${pos.x}%`} y={`${pos.y}%`} />
        ))}
    </div>
  );
}