"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { X, Send } from "lucide-react";

type Expression = "idle" | "happy" | "thinking" | "excited" | "waving" | "sleeping" | "love" | "wink";

const TIPS = [
  { section: "home", msg: "Welcome to Ember! Click me anytime for tips.", expr: "waving" as Expression },
  { section: "services", msg: "Our AI chatbots can handle 80% of customer queries automatically!", expr: "excited" as Expression },
  { section: "about", msg: "We've delivered 150+ projects with a 98% retention rate.", expr: "happy" as Expression },
  { section: "process", msg: "From idea to launch in as little as 3 weeks!", expr: "thinking" as Expression },
  { section: "portfolio", msg: "Hover over our projects to see the tech stack we used.", expr: "wink" as Expression },
  { section: "testimonials", msg: "Our clients see an average 340% engagement increase!", expr: "excited" as Expression },
  { section: "pricing", msg: "Payment plans available on all packages.", expr: "happy" as Expression },
  { section: "contact", msg: "Fill out the form and we'll respond within 24 hours!", expr: "waving" as Expression },
];

const RANDOM_MESSAGES = [
  "Need help? I'm here!",
  "Fun fact: Our sites load in under 1.5s!",
  "Did you know? We offer free strategy calls!",
  "Scroll down to see our work!",
  "Click Launch Your Future to get started!",
  "We build with Next.js, React, and AI.",
  "Pro tip: Check out our pricing!",
];

const KNOWLEDGE_BASE: { keywords: string[]; response: string; expr: Expression }[] = [
  { keywords: ["price", "pricing", "cost", "how much", "budget", "expensive", "cheap", "affordable"], response: "Our packages start from R9,999 for landing pages up to R75,000+ for enterprise solutions. We also offer payment plans! Check out the Pricing section for details, or reach out for a custom quote.", expr: "happy" },
  { keywords: ["chatbot", "ai bot", "ai assistant", "automat"], response: "Our AI chatbots are custom-trained on your business data, handle 80%+ of inquiries automatically, and integrate with WhatsApp, web, and social channels. They're one of our most popular services!", expr: "excited" },
  { keywords: ["website", "web design", "landing page", "redesign", "build a site"], response: "We build high-performance websites using Next.js and React — landing pages, corporate sites, e-commerce, and custom web apps. All mobile-responsive and SEO-optimized!", expr: "happy" },
  { keywords: ["ecommerce", "e-commerce", "shop", "store", "sell online"], response: "We build conversion-optimized online stores with Stripe, PayFast, or Shopify integration. Inventory management, real-time analytics, and subscription support included!", expr: "excited" },
  { keywords: ["seo", "search", "google", "ranking", "visibility"], response: "We specialize in technical SEO, content strategy, and performance optimization. Our sites load in under 1.5s and score 95+ on Core Web Vitals — which Google loves!", expr: "thinking" },
  { keywords: ["hosting", "server", "deploy", "uptime", "domain"], response: "We offer managed hosting on Vercel, AWS, or dedicated servers with 99.9% uptime SLAs. Includes SSL, CDN, monitoring, and automated backups.", expr: "idle" },
  { keywords: ["timeline", "how long", "when", "deadline", "turnaround", "fast"], response: "Landing pages: 3–5 days. Standard websites: 2–4 weeks. Complex web apps: 6–8 weeks. We'll give you a detailed timeline during our free strategy call!", expr: "thinking" },
  { keywords: ["maintain", "support", "update", "after launch", "ongoing", "bug"], response: "Every project includes 30 days of free post-launch support. We also offer ongoing maintenance plans with security monitoring, updates, and priority support.", expr: "happy" },
  { keywords: ["contact", "hire", "start", "begin", "get in touch", "reach out", "book"], response: "Great! Scroll down to the Contact section to fill out our form, or click 'Start a Project' below. We respond within 24 hours and offer free strategy calls!", expr: "waving" },
  { keywords: ["hello", "hi", "hey", "good morning", "good evening", "greetings"], response: "Hey there! I'm Ember, your digital companion. I can tell you about our services, pricing, timelines, or help you get started. What would you like to know?", expr: "waving" },
  { keywords: ["thank", "thanks", "awesome", "great", "cool", "perfect"], response: "You're welcome! If you need anything else, I'm right here. Or head to the Contact section to start your project!", expr: "love" },
  { keywords: ["portfolio", "work", "projects", "examples", "previous", "case stud"], response: "Check out our Portfolio section below! We've built 150+ projects spanning e-commerce, AI chatbots, corporate sites, and custom web apps with an average 340% engagement increase.", expr: "excited" },
  { keywords: ["mobile", "responsive", "phone", "tablet", "screen"], response: "All our websites are mobile-first and responsive across every viewport — phones, tablets, and ultrawide monitors. Touch-optimized and accessibility-compliant too!", expr: "wink" },
  { keywords: ["security", "safe", "secure", "hack", "ssl", "protect"], response: "Security is built into everything we do. We implement SSL, real-time monitoring, automated backups, and follow OWASP best practices. Your data stays safe!", expr: "thinking" },
];

function matchResponse(input: string): { response: string; expr: Expression } {
  const lower = input.toLowerCase();
  for (const entry of KNOWLEDGE_BASE) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return { response: entry.response, expr: entry.expr };
    }
  }
  return { response: "That's a great question! I'd recommend reaching out to our team via the Contact section for a detailed answer. They respond within 24 hours!", expr: "thinking" };
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function EmberFace({ expression, size = 48 }: { expression: Expression; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.4;
  const eyeY = cy - size * 0.05;
  const leftEyeX = cx - size * 0.13;
  const rightEyeX = cx + size * 0.13;
  const mouthY = cy + size * 0.14;

  const getEyes = () => {
    const eyeR = size * 0.06;
    switch (expression) {
      case "happy":
      case "love":
        return (
          <>
            <path d={`M${leftEyeX - size * 0.07} ${eyeY + size * 0.01} Q${leftEyeX} ${eyeY - size * 0.08} ${leftEyeX + size * 0.07} ${eyeY + size * 0.01}`} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
            <path d={`M${rightEyeX - size * 0.07} ${eyeY + size * 0.01} Q${rightEyeX} ${eyeY - size * 0.08} ${rightEyeX + size * 0.07} ${eyeY + size * 0.01}`} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          </>
        );
      case "excited":
        return (
          <>
            <circle cx={leftEyeX} cy={eyeY - size * 0.02} r={eyeR * 1.2} fill="#fff" />
            <circle cx={rightEyeX} cy={eyeY - size * 0.02} r={eyeR * 1.2} fill="#fff" />
            <circle cx={leftEyeX + size * 0.015} cy={eyeY - size * 0.03} r={eyeR * 0.5} fill="#04060e" />
            <circle cx={rightEyeX + size * 0.015} cy={eyeY - size * 0.03} r={eyeR * 0.5} fill="#04060e" />
            <circle cx={leftEyeX - size * 0.02} cy={eyeY - size * 0.05} r={eyeR * 0.25} fill="#fff" />
            <circle cx={rightEyeX - size * 0.02} cy={eyeY - size * 0.05} r={eyeR * 0.25} fill="#fff" />
          </>
        );
      case "wink":
        return (
          <>
            <circle cx={leftEyeX} cy={eyeY} r={eyeR} fill="#fff" />
            <circle cx={leftEyeX + size * 0.015} cy={eyeY - size * 0.01} r={eyeR * 0.5} fill="#04060e" />
            <circle cx={leftEyeX - size * 0.02} cy={eyeY - size * 0.03} r={eyeR * 0.25} fill="#fff" />
            <path d={`M${rightEyeX - size * 0.06} ${eyeY} Q${rightEyeX} ${eyeY - size * 0.07} ${rightEyeX + size * 0.06} ${eyeY}`} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          </>
        );
      case "thinking":
        return (
          <>
            <circle cx={leftEyeX} cy={eyeY} r={eyeR * 1.1} fill="#fff" />
            <circle cx={leftEyeX + size * 0.02} cy={eyeY - size * 0.01} r={eyeR * 0.5} fill="#04060e" />
            <circle cx={leftEyeX - size * 0.015} cy={eyeY - size * 0.03} r={eyeR * 0.2} fill="#fff" />
            <ellipse cx={rightEyeX} cy={eyeY - size * 0.03} rx={eyeR * 0.7} ry={eyeR * 1.2} fill="#fff" />
            <circle cx={rightEyeX + size * 0.02} cy={eyeY - size * 0.04} r={eyeR * 0.4} fill="#04060e" />
          </>
        );
      case "sleeping":
        return (
          <>
            <path d={`M${leftEyeX - size * 0.05} ${eyeY} Q${leftEyeX} ${eyeY + size * 0.02} ${leftEyeX + size * 0.05} ${eyeY}`} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            <path d={`M${rightEyeX - size * 0.05} ${eyeY} Q${rightEyeX} ${eyeY + size * 0.02} ${rightEyeX + size * 0.05} ${eyeY}`} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          </>
        );
      default:
        return (
          <>
            <circle cx={leftEyeX} cy={eyeY} r={eyeR} fill="#fff" />
            <circle cx={rightEyeX} cy={eyeY} r={eyeR} fill="#fff" />
            <circle cx={leftEyeX + size * 0.015} cy={eyeY - size * 0.01} r={eyeR * 0.55} fill="#04060e" />
            <circle cx={rightEyeX + size * 0.015} cy={eyeY - size * 0.01} r={eyeR * 0.55} fill="#04060e" />
            <circle cx={leftEyeX - size * 0.025} cy={eyeY - size * 0.035} r={eyeR * 0.25} fill="#fff" />
            <circle cx={rightEyeX - size * 0.025} cy={eyeY - size * 0.035} r={eyeR * 0.25} fill="#fff" />
          </>
        );
    }
  };

  const getMouth = () => {
    switch (expression) {
      case "happy":
      case "love":
        return <path d={`M${cx - size * 0.1} ${mouthY} Q${cx} ${mouthY + size * 0.12} ${cx + size * 0.1} ${mouthY}`} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />;
      case "excited":
        return (
          <>
            <ellipse cx={cx} cy={mouthY + size * 0.03} rx={size * 0.08} ry={size * 0.06} fill="#04060e" />
            <path d={`M${cx - size * 0.06} ${mouthY + size * 0.01} Q${cx} ${mouthY + size * 0.02} ${cx + size * 0.06} ${mouthY + size * 0.01}`} fill="none" stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
          </>
        );
      case "wink":
        return <path d={`M${cx - size * 0.07} ${mouthY + size * 0.01} Q${cx} ${mouthY + size * 0.08} ${cx + size * 0.07} ${mouthY + size * 0.01}`} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />;
      case "thinking":
        return <ellipse cx={cx + size * 0.04} cy={mouthY + size * 0.02} rx={size * 0.04} ry={size * 0.03} fill="#fff" opacity="0.7" />;
      case "sleeping":
        return <path d={`M${cx - size * 0.04} ${mouthY + size * 0.02} L${cx + size * 0.04} ${mouthY + size * 0.02}`} fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />;
      case "waving":
        return <path d={`M${cx - size * 0.06} ${mouthY + size * 0.01} Q${cx} ${mouthY + size * 0.06} ${cx + size * 0.06} ${mouthY + size * 0.01}`} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />;
      default:
        return <path d={`M${cx - size * 0.07} ${mouthY} Q${cx} ${mouthY + size * 0.06} ${cx + size * 0.07} ${mouthY}`} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />;
    }
  };

  const getCheeks = () => {
    if (expression === "happy" || expression === "excited" || expression === "love") {
      return (
        <>
          <circle cx={leftEyeX - size * 0.08} cy={mouthY - size * 0.05} r={size * 0.04} fill="rgba(255,255,255,0.08)" />
          <circle cx={rightEyeX + size * 0.08} cy={mouthY - size * 0.05} r={size * 0.04} fill="rgba(255,255,255,0.08)" />
        </>
      );
    }
    return null;
  };

  const getBrows = () => {
    if (expression === "thinking") {
      return (
        <>
          <path d={`M${leftEyeX - size * 0.05} ${eyeY - size * 0.1} L${leftEyeX + size * 0.05} ${eyeY - size * 0.11}`} fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
          <path d={`M${rightEyeX - size * 0.05} ${eyeY - size * 0.07} L${rightEyeX + size * 0.05} ${eyeY - size * 0.1}`} fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        </>
      );
    }
    if (expression === "excited") {
      return (
        <>
          <path d={`M${leftEyeX - size * 0.06} ${eyeY - size * 0.13} L${leftEyeX + size * 0.06} ${eyeY - size * 0.1}`} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
          <path d={`M${rightEyeX - size * 0.06} ${eyeY - size * 0.13} L${rightEyeX + size * 0.06} ${eyeY - size * 0.1}`} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        </>
      );
    }
    return null;
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <radialGradient id="ember-grad" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#ffc56b" />
          <stop offset="35%" stopColor="#ff8c3a" />
          <stop offset="70%" stopColor="#ff6b2b" />
          <stop offset="100%" stopColor="#c04400" />
        </radialGradient>
        <radialGradient id="ember-shine" cx="40%" cy="25%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <filter id="ember-glow-new">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="url(#ember-grad)" filter="url(#ember-glow-new)" />
      <circle cx={cx} cy={cy} r={r} fill="url(#ember-shine)" />
      {getBrows()}
      {getEyes()}
      {getMouth()}
      {getCheeks()}
    </svg>
  );
}

export default function EmberAvatar() {
  const [isOpen, setIsOpen] = useState(false);
  const [expression, setExpression] = useState<Expression>("idle");
  const [message, setMessage] = useState("");
  const [lastTip, setLastTip] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "assistant", content: "Hi! I'm Ember, your digital companion. Ask me about our services, pricing, timelines, or anything else!" },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();

  const visibleY = useTransform(scrollYProgress, [0, 0.2], [-20, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.05], [0, 1]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) return;
    const blinkInterval = setInterval(() => {
      setExpression((prev) => {
        if (prev === "idle") {
          setTimeout(() => {
            if (!isOpen) setExpression("idle");
          }, 200);
          return "sleeping";
        }
        return prev;
      });
    }, 4000 + Math.random() * 3000);
    return () => clearInterval(blinkInterval);
  }, [isOpen]);

  useEffect(() => {
    if (hasInteracted) return;
    const timer1 = setTimeout(() => {
      setExpression("waving");
      setMessage("Hey! I'm Ember. Click me for tips!");
      setTimeout(() => {
        if (!hasInteracted) {
          setExpression("idle");
          setMessage("");
        }
      }, 5000);
    }, 8000);
    return () => clearTimeout(timer1);
  }, [hasInteracted]);

  useCallback(() => {
    const msg = RANDOM_MESSAGES[Math.floor(Math.random() * RANDOM_MESSAGES.length)];
    setMessage(msg);
    setExpression("happy");
    setTimeout(() => { setExpression("idle"); }, 4000);
  }, []);

  const showSectionTip = useCallback((sectionId: string) => {
    const tip = TIPS.find((t) => t.section === sectionId);
    if (tip) {
      setExpression(tip.expr);
      setMessage(tip.msg);
    }
  }, []);

  useEffect(() => {
    if (!hasInteracted) return;
    const sections = ["home", "services", "about", "process", "portfolio", "testimonials", "pricing", "contact"];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            if (sections.includes(id)) {
              const now = Date.now();
              if (now - lastTip > 15000) {
                setLastTip(now);
                showSectionTip(id);
                setTimeout(() => setMessage(""), 5000);
              }
            }
          }
        });
      },
      { threshold: 0.4 }
    );
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [hasInteracted, lastTip, showSectionTip]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (!hasInteracted) setHasInteracted(true);

    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: "user", content: trimmed }]);
    setInput("");
    setIsTyping(true);
    setExpression("thinking");

    setTimeout(() => {
      const { response, expr } = matchResponse(trimmed);
      setMessages((prev) => [...prev, { id: `bot-${Date.now()}`, role: "assistant", content: response }]);
      setExpression(expr);
      setIsTyping(false);
    }, 800 + Math.random() * 600);
  };

  const handleClick = () => {
    if (!hasInteracted) setHasInteracted(true);
    setIsOpen(true);
    setExpression("excited");
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    setExpression("idle");
    setMessage("");
  };

  useEffect(() => {
    if (isOpen && message) {
      const timer = setTimeout(() => { setExpression("idle"); }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, message]);

  const shakeAnimation = expression === "waving"
    ? { rotate: [0, 12, -12, 8, -4, 0] }
    : expression === "excited"
      ? { rotate: [0, -6, 6, -4, 0], scale: [1, 1.05, 1] }
      : expression === "love"
        ? { scale: [1, 1.08, 1] }
        : {};

  return (
    <>
      <motion.div
        ref={containerRef}
        className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50"
        style={{ y: visibleY, opacity }}
      >
        <motion.div
          className="relative"
          animate={shakeAnimation}
          transition={expression === "waving" ? { duration: 0.8 } : { duration: 0.5 }}
        >
          <motion.button
            onClick={handleClick}
            className="relative group cursor-pointer"
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.92 }}
            aria-label="Ember assistant"
          >
            <motion.div
              className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center"
              animate={!isOpen ? { y: [0, -5, 0] } : {}}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Outer glow ring */}
              <div className="absolute inset-0 rounded-full">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#ff6b2b] to-[#f7a541] opacity-20 group-hover:opacity-35 transition-opacity duration-500 animate-pulse" />
              </div>
              <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-[#ff6b2b]/20 via-[#f7a541]/10 to-[#ff6b2b]/20 blur-xl group-hover:from-[#ff6b2b]/40 group-hover:via-[#f7a541]/20 group-hover:to-[#ff6b2b]/40 transition-all duration-700" />

              {/* Orbiting ring */}
              <div className="absolute -inset-2">
                <motion.div
                  className="absolute inset-0 rounded-full border border-[#ff6b2b]/15"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                  className="absolute top-0 left-1/2 w-1.5 h-1.5 rounded-full bg-[#ff6b2b] -translate-x-1/2 shadow-[0_0_6px_rgba(255,107,43,0.6)]"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  style={{ transformOrigin: "0px 32px" }}
                />
              </div>

              {/* Face circle */}
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-[#ffc56b] via-[#ff8c3a] to-[#c04400] flex items-center justify-center shadow-[0_0_25px_rgba(255,107,43,0.4),0_0_50px_rgba(255,107,43,0.15)] group-hover:shadow-[0_0_35px_rgba(255,107,43,0.6),0_0_70px_rgba(255,107,43,0.2)] transition-shadow duration-500">
                <EmberFace expression={expression} size={48} />
              </div>

              {/* Sparkle particles */}
              {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                <motion.div
                  key={i}
                  className="absolute w-0.5 h-0.5 rounded-full bg-[#f7a541]"
                  style={{
                    top: "50%",
                    left: "50%",
                    transform: `rotate(${deg}deg) translateY(-32px) translate(-50%, -50%)`,
                  }}
                  animate={{ opacity: [0, 0.8, 0], scale: [0.5, 1.5, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
                />
              ))}
            </motion.div>

            {/* Tooltip bubble */}
            {!isOpen && message && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                className="absolute bottom-full right-0 mb-3 max-w-[200px] sm:max-w-[240px]"
              >
                <div className="relative bg-[#0a0e1a] border border-[#ff6b2b]/20 rounded-xl px-3 py-2 text-xs sm:text-sm text-[#e8eaf6] font-body leading-snug shadow-xl shadow-[rgba(255,107,43,0.15)]">
                  <div className="absolute top-1 left-2.5 w-1 h-1 rounded-full bg-[#ff6b2b] animate-pulse" />
                  <div className="pl-2.5">{message}</div>
                  <div className="absolute -bottom-1.5 right-5 w-3 h-3 bg-[#0a0e1a] border-r border-b border-[#ff6b2b]/20 rotate-45" />
                </div>
              </motion.div>
            )}

            {/* Notification dot */}
            {!isOpen && !message && !hasInteracted && (
              <motion.div
                className="absolute top-0 right-0 w-3 h-3 bg-[#00f0ff] rounded-full"
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50 w-[300px] sm:w-[370px]"
          >
            <div className="bg-[#0a0e1a]/98 backdrop-blur-2xl border border-[#ff6b2b]/15 rounded-2xl shadow-2xl shadow-[rgba(255,107,43,0.15)] overflow-hidden flex flex-col max-h-[480px]">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[#1a1e2e] bg-gradient-to-r from-[#ff6b2b]/5 to-transparent">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ y: [0, -2, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div className="relative">
                      <EmberFace expression={expression} size={36} />
                      <motion.div
                        className="absolute -inset-1 rounded-full border border-[#ff6b2b]/20"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                      />
                    </div>
                  </motion.div>
                  <div>
                    <div className="text-sm font-display font-bold text-gradient-ember">Ember</div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00e5c3] animate-pulse shadow-[0_0_4px_rgba(0,229,195,0.5)]" />
                      <span className="text-[9px] font-mono-accent text-[#00e5c3]/70 tracking-wider">ONLINE</span>
                    </div>
                  </div>
                </div>
                <button onClick={handleClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6b7394]/70 hover:text-[#f0f0f5] hover:bg-[#1e1e2e]/50 transition-all min-h-[36px] min-w-[36px]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[300px]">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#ffc56b] to-[#ff6b2b] flex-shrink-0 mr-2 mt-1 flex items-center justify-center shadow-[0_0_8px_rgba(255,107,43,0.4)]">
                        <div className="w-3 h-3 rounded-full bg-[#ffc56b] opacity-60" />
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-[#ff6b2b]/20 to-[#f7a541]/10 border border-[#ff6b2b]/20 text-[#f0f0f5] text-xs sm:text-sm font-body"
                        : "bg-[#121a2e]/80 border border-[#1a1e2e] text-[#e8eaf6]/80 text-xs sm:text-sm font-body"
                    }`}>
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#ffc56b] to-[#ff6b2b] flex-shrink-0 mr-2 mt-1 shadow-[0_0_8px_rgba(255,107,43,0.4)]" />
                    <div className="bg-[#121a2e]/80 border border-[#1a1e2e] rounded-2xl px-4 py-3 flex gap-1.5">
                      <motion.div className="w-2 h-2 rounded-full bg-[#ff6b2b]/60" animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                      <motion.div className="w-2 h-2 rounded-full bg-[#ff6b2b]/60" animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }} />
                      <motion.div className="w-2 h-2 rounded-full bg-[#ff6b2b]/60" animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick actions + input */}
              <div className="p-3 pt-2 border-t border-[#1a1e2e]">
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {["Pricing", "Timeline", "Chatbots", "Contact"].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); }}
                      className="text-[10px] font-mono-accent px-2.5 py-1 rounded-full border border-[#ff6b2b]/15 text-[#ff6b2b]/70 hover:text-[#ff6b2b] hover:border-[#ff6b2b]/40 hover:bg-[#ff6b2b]/5 hover:shadow-[0_0_8px_rgba(255,107,43,0.15)] transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  className="flex gap-2"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask Ember anything..."
                    className="flex-1 bg-[#04060e]/80 border border-[#1a1e2e] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#f0f0f5] font-body placeholder:text-[#6b7394]/30 focus:border-[#ff6b2b]/40 focus:outline-none focus:ring-1 focus:ring-[#ff6b2b]/20 focus:shadow-[0_0_12px_rgba(255,107,43,0.1)] transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isTyping}
                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f7a541] to-[#ff6b2b] flex items-center justify-center text-[#04060e] hover:shadow-[0_0_20px_rgba(255,107,43,0.4)] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}