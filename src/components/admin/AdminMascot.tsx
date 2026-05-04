"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, Users, Sparkles, Rocket, CheckCircle, BarChart3, Clock, Heart, Zap, Shield, LucideIcon } from "lucide-react";

type Expression = "idle" | "happy" | "thinking" | "excited" | "motivated" | "proud" | "wink" | "sleeping";

function pseudoRandom(seed: number): number {
  const a = 9301;
  const c = 49297;
  const m = 233280;
  const value = (seed * a + c) % m;
  return value / m;
}

const randomIndex = (seed: number, max: number) => Math.floor(pseudoRandom(seed) * max);

const MOTIVATIONS = [
  { msg: "You're crushing it today! Every line of code moves the needle.", expr: "motivated" as Expression },
  { msg: "Another client signed? That's the Ember effect in action!", expr: "excited" as Expression },
  { msg: "Remember: consistency beats intensity. Keep showing up!", expr: "proud" as Expression },
  { msg: "Your projects are shaping the future. No pressure — just purpose.", expr: "motivated" as Expression },
  { msg: "Small wins compound. You're building something legendary.", expr: "happy" as Expression },
  { msg: "Every great agency started exactly where you are. Keep going!", expr: "motivated" as Expression },
  { msg: "Your clients chose you for a reason. Deliver the magic!", expr: "excited" as Expression },
  { msg: "Revenue is climbing. You're on the right track!", expr: "proud" as Expression },
  { msg: "The grind today is the glory tomorrow. Stay focused!", expr: "motivated" as Expression },
  { msg: "You didn't come this far to only come this far. Push through!", expr: "motivated" as Expression },
  { msg: "Progress, not perfection. Each day you're better than yesterday.", expr: "happy" as Expression },
  { msg: "Your work changes businesses. That's impact. That's legacy.", expr: "proud" as Expression },
];

const UPDATES = [
  { msg: "New lead received! Check the Leads panel to follow up.", icon: Users, expr: "excited" as Expression },
  { msg: "Project milestone completed — time to update the client!", icon: CheckCircle, expr: "proud" as Expression },
  { msg: "Revenue trending up this week. Keep that momentum!", icon: TrendingUp, expr: "happy" as Expression },
  { msg: "Client payment received. Cash flow looking healthy!", icon: BarChart3, expr: "motivated" as Expression },
  { msg: "A project deadline is approaching. Stay on top of it!", icon: Clock, expr: "thinking" as Expression },
  { msg: "You haven't checked the dashboard in a while. Anything need attention?", icon: Sparkles, expr: "wink" as Expression },
];

function MiniEmberFace({ expression, size = 32 }: { expression: Expression; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.4;
  const eyeY = cy - size * 0.05;
  const leftEyeX = cx - size * 0.13;
  const rightEyeX = cx + size * 0.13;
  const mouthY = cy + size * 0.14;
  const eyeR = size * 0.06;

  const getEyes = () => {
    switch (expression) {
      case "happy":
      case "proud":
        return (
          <>
            <path d={`M${leftEyeX - size * 0.07} ${eyeY + size * 0.01} Q${leftEyeX} ${eyeY - size * 0.08} ${leftEyeX + size * 0.07} ${eyeY + size * 0.01}`} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            <path d={`M${rightEyeX - size * 0.07} ${eyeY + size * 0.01} Q${rightEyeX} ${eyeY - size * 0.08} ${rightEyeX + size * 0.07} ${eyeY + size * 0.01}`} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          </>
        );
      case "excited":
      case "motivated":
        return (
          <>
            <circle cx={leftEyeX} cy={eyeY - size * 0.02} r={eyeR * 1.1} fill="#fff" />
            <circle cx={rightEyeX} cy={eyeY - size * 0.02} r={eyeR * 1.1} fill="#fff" />
            <circle cx={leftEyeX + size * 0.015} cy={eyeY - size * 0.03} r={eyeR * 0.5} fill="#1a0a00" />
            <circle cx={rightEyeX + size * 0.015} cy={eyeY - size * 0.03} r={eyeR * 0.5} fill="#1a0a00" />
            <circle cx={leftEyeX - size * 0.02} cy={eyeY - size * 0.05} r={eyeR * 0.2} fill="#fff" />
            <circle cx={rightEyeX - size * 0.02} cy={eyeY - size * 0.05} r={eyeR * 0.2} fill="#fff" />
          </>
        );
      case "wink":
        return (
          <>
            <circle cx={leftEyeX} cy={eyeY} r={eyeR} fill="#fff" />
            <circle cx={leftEyeX + size * 0.015} cy={eyeY - size * 0.01} r={eyeR * 0.5} fill="#1a0a00" />
            <path d={`M${rightEyeX - size * 0.06} ${eyeY} Q${rightEyeX} ${eyeY - size * 0.07} ${rightEyeX + size * 0.06} ${eyeY}`} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          </>
        );
      case "thinking":
        return (
          <>
            <circle cx={leftEyeX} cy={eyeY} r={eyeR * 1.1} fill="#fff" />
            <circle cx={leftEyeX + size * 0.02} cy={eyeY - size * 0.01} r={eyeR * 0.5} fill="#1a0a00" />
            <ellipse cx={rightEyeX} cy={eyeY - size * 0.03} rx={eyeR * 0.7} ry={eyeR * 1.2} fill="#fff" />
            <circle cx={rightEyeX + size * 0.02} cy={eyeY - size * 0.04} r={eyeR * 0.4} fill="#1a0a00" />
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
            <circle cx={leftEyeX + size * 0.015} cy={eyeY - size * 0.01} r={eyeR * 0.55} fill="#1a0a00" />
            <circle cx={rightEyeX + size * 0.015} cy={eyeY - size * 0.01} r={eyeR * 0.55} fill="#1a0a00" />
            <circle cx={leftEyeX - size * 0.025} cy={eyeY - size * 0.035} r={eyeR * 0.25} fill="#fff" />
            <circle cx={rightEyeX - size * 0.025} cy={eyeY - size * 0.035} r={eyeR * 0.25} fill="#fff" />
          </>
        );
    }
  };

  const getMouth = () => {
    switch (expression) {
      case "happy":
      case "proud":
        return <path d={`M${cx - size * 0.1} ${mouthY} Q${cx} ${mouthY + size * 0.12} ${cx + size * 0.1} ${mouthY}`} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />;
      case "excited":
      case "motivated":
        return (
          <>
            <ellipse cx={cx} cy={mouthY + size * 0.03} rx={size * 0.08} ry={size * 0.06} fill="#1a0a00" />
            <path d={`M${cx - size * 0.06} ${mouthY + size * 0.01} Q${cx} ${mouthY + size * 0.02} ${cx + size * 0.06} ${mouthY + size * 0.01}`} fill="none" stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
          </>
        );
      case "wink":
        return <path d={`M${cx - size * 0.07} ${mouthY + size * 0.01} Q${cx} ${mouthY + size * 0.08} ${cx + size * 0.07} ${mouthY + size * 0.01}`} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />;
      case "thinking":
        return <ellipse cx={cx + size * 0.04} cy={mouthY + size * 0.02} rx={size * 0.04} ry={size * 0.03} fill="#fff" opacity="0.7" />;
      case "sleeping":
        return <path d={`M${cx - size * 0.04} ${mouthY + size * 0.02} L${cx + size * 0.04} ${mouthY + size * 0.02}`} fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />;
      default:
        return <path d={`M${cx - size * 0.07} ${mouthY} Q${cx} ${mouthY + size * 0.06} ${cx + size * 0.07} ${mouthY}`} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />;
    }
  };

  const getCheeks = () => {
    if (expression === "happy" || expression === "excited" || expression === "motivated" || expression === "proud") {
      return (
        <>
          <circle cx={leftEyeX - size * 0.08} cy={mouthY - size * 0.05} r={size * 0.04} fill="rgba(255,255,255,0.08)" />
          <circle cx={rightEyeX + size * 0.08} cy={mouthY - size * 0.05} r={size * 0.04} fill="rgba(255,255,255,0.08)" />
        </>
      );
    }
    return null;
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <radialGradient id="admin-ember-grad" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#ffc56b" />
          <stop offset="30%" stopColor="#ff8c3a" />
          <stop offset="65%" stopColor="#00f0ff" />
          <stop offset="100%" stopColor="#0066aa" />
        </radialGradient>
        <radialGradient id="admin-ember-shine" cx="40%" cy="25%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <filter id="admin-ember-glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="url(#admin-ember-grad)" filter="url(#admin-ember-glow)" />
      <circle cx={cx} cy={cy} r={r} fill="url(#admin-ember-shine)" />
      {getEyes()}
      {getMouth()}
      {getCheeks()}
    </svg>
  );
}

interface AdminMascotMessage {
  id: string;
  content: string;
  icon?: LucideIcon;
  type: "motivation" | "update" | "tip";
}

export default function AdminMascot() {
  const [isOpen, setIsOpen] = useState(false);
  const [expression, setExpression] = useState<Expression>("idle");
  const [messages, setMessages] = useState<AdminMascotMessage[]>([
    { id: "welcome", content: "Welcome back, Josh! Your dashboard is ready. Let's make today count!", type: "motivation" },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [hasNewMessage, setHasNewMessage] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

useEffect(() => {
      const blinkInterval = setInterval(() => {
        setExpression((prev) => {
          if (prev === "idle") {
            setTimeout(() => setExpression("idle"), 200);
            return "sleeping";
          }
          return prev;
        });
      }, 4000 + pseudoRandom(Date.now()) * 3000);
      return () => clearInterval(blinkInterval);
    }, []);


  const addMessage = useCallback((content: string, icon: LucideIcon | undefined, expr: Expression, type: "motivation" | "update" | "tip") => {
    const id = `msg-${Date.now()}`;
    setMessages((prev) => [...prev.slice(-19), { id, content, icon, type }]);
    setExpression(expr);
    if (!isOpen) setHasNewMessage(true);
    setTimeout(() => setExpression("idle"), 4000);
  }, [isOpen]);

  useEffect(() => {
    const tips = [...UPDATES].sort(() => pseudoRandom(Date.now()) - 0.5).slice(0, 3);
    const delays = [15000, 45000, 90000];
    const timers = delays.map((delay, i) =>
      setTimeout(() => {
        const tip = tips[i];
        addMessage(tip.msg, tip.icon, tip.expr, "update");
      }, delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [addMessage]);

  useEffect(() => {
const interval = setInterval(() => {
        const m = MOTIVATIONS[Math.floor(pseudoRandom(Date.now()) * MOTIVATIONS.length)];
        addMessage(m.msg, Heart, m.expr, "motivation");
      }, 120000);
    return () => clearInterval(interval);
  }, [addMessage]);

  const handleQuickAction = (action: string) => {
    const responses: Record<string, { content?: string; expr: Expression; icon: LucideIcon }> = {
      "Status": { content: "All systems running smoothly! Check your dashboard stats for the latest metrics.", expr: "proud", icon: CheckCircle },
      "Leads": { content: "New leads are coming in! Head to the Leads panel to review and follow up with potential clients.", expr: "excited", icon: Users },
      "Revenue": { content: "Revenue is tracking well this month. Keep pushing on those proposals — every one counts!", expr: "motivated", icon: TrendingUp },
      "Focus": { content: "Pro tip: Focus on completing in-progress projects first. Happy clients = more referrals!", expr: "thinking", icon: Sparkles },
      "Motivate": { expr: "motivated", icon: Rocket },
    };
    const r = responses[action];
    if (r) {
      if (action === "Motivate") {
        // eslint-disable-next-line react-hooks/purity
        const randomMsg = MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)].msg;
        addMessage(randomMsg, r.icon, r.expr, "tip");
      } else {
        addMessage(r.content!, r.icon, r.expr, "tip");
      }
    }
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    setExpression("thinking");

    const lower = trimmed.toLowerCase();
    let response = "";
    let expr: Expression = "happy";

    if (lower.includes("lead") || lower.includes("client") || lower.includes("customer")) {
      response = "Your leads panel has the latest client inquiries. Prioritize warm leads for best conversion!";
      expr = "excited";
    } else if (lower.includes("revenue") || lower.includes("money") || lower.includes("income") || lower.includes("sales")) {
      response = "Revenue is the lifeblood of any agency. Check the Analytics panel for trends and projections!";
      expr = "motivated";
    } else if (lower.includes("project") || lower.includes("deadline") || lower.includes("progress")) {
      response = "Your projects dashboard tracks milestones and deadlines. Stay on top of them — clients love on-time delivery!";
      expr = "thinking";
    } else if (lower.includes("help") || lower.includes("what can") || lower.includes("how")) {
      response = "I'm your admin companion! I provide motivation, updates, and tips. Click the quick actions below or ask me about leads, revenue, projects, or anything else!";
      expr = "wink";
    } else if (lower.includes("motivat") || lower.includes("encourage") || lower.includes("inspire")) {
      response = MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)].msg;
      expr = "motivated";
    } else if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
      response = "Hey Josh! Great to see you in the dashboard. What are we working on today?";
      expr = "excited";
    } else if (lower.includes("thank")) {
      response = "Anytime! I'm here whenever you need a boost or a reminder. You've got this! 💪";
      expr = "proud";
    } else {
      response = "Good question! I'd recommend checking the relevant dashboard section for the latest data. Need motivation? Click the Motivate button!";
      expr = "thinking";
    }

    setIsTyping(true);
    setTimeout(() => {
      addMessage(response, Sparkles, expr, "tip");
      setIsTyping(false);
    }, 600 + Math.random() * 400);
  };

  const getAccentColor = (type: string) => {
    if (type === "motivation") return "#ff6b2b";
    if (type === "update") return "#00f0ff";
    return "#3b82f6";
  };

  return (
    <>
      <motion.div className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50">
        <motion.button
          onClick={() => { setIsOpen(true); setHasNewMessage(false); setExpression("excited"); }}
          className="relative group cursor-pointer"
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.92 }}
          aria-label="Admin companion"
        >
          <motion.div
            className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center"
            animate={!isOpen ? { y: [0, -5, 0] } : {}}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-[#00f0ff]/20 via-[#3b82f6]/10 to-[#00f0ff]/20 blur-xl group-hover:from-[#00f0ff]/40 group-hover:via-[#3b82f6]/20 group-hover:to-[#00f0ff]/40 transition-all duration-700" />
            <div className="absolute -inset-1.5 rounded-full">
              <motion.div
                className="absolute inset-0 rounded-full border border-[#00f0ff]/20"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="absolute top-0 left-1/2 w-1.5 h-1.5 rounded-full bg-[#00f0ff] -translate-x-1/2 shadow-[0_0_6px_rgba(0,240,255,0.6)]"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                style={{ transformOrigin: "0px 32px" }}
              />
            </div>
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-[#ffc56b] via-[#00f0ff] to-[#0066aa] flex items-center justify-center shadow-[0_0_25px_rgba(0,240,255,0.4),0_0_50px_rgba(0,240,255,0.15)] group-hover:shadow-[0_0_35px_rgba(0,240,255,0.6),0_0_70px_rgba(0,240,255,0.2)] transition-shadow duration-500">
              <MiniEmberFace expression={expression} size={48} />
            </div>

            {[0, 72, 144, 216, 288].map((deg, i) => (
              <motion.div
                key={i}
                className="absolute w-0.5 h-0.5 rounded-full bg-[#00f0ff]"
                style={{ top: "50%", left: "50%", transform: `rotate(${deg}deg) translateY(-32px) translate(-50%, -50%)` }}
                animate={{ opacity: [0, 0.8, 0], scale: [0.5, 1.3, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.25, ease: "easeInOut" }}
              />
            ))}
          </motion.div>

          {hasNewMessage && !isOpen && (
            <motion.div
              className="absolute -top-1 -right-1 w-4 h-4 bg-[#00f0ff] rounded-full flex items-center justify-center"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <span className="text-[8px] font-bold text-[#04060e]">{messages.length > 9 ? "9+" : messages.length}</span>
            </motion.div>
          )}
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50 w-[300px] sm:w-[370px]"
          >
            <div className="bg-[#0a0e1a]/98 backdrop-blur-2xl border border-[#00f0ff]/15 rounded-2xl shadow-2xl shadow-[rgba(0,240,255,0.15)] overflow-hidden flex flex-col max-h-[520px]">
              <div className="flex items-center justify-between p-4 border-b border-[#1a1e2e] bg-gradient-to-r from-[#00f0ff]/5 to-transparent">
                <div className="flex items-center gap-3">
                  <motion.div animate={{ y: [0, -2, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                    <div className="relative">
                      <MiniEmberFace expression={expression} size={36} />
                      <motion.div
                        className="absolute -inset-1 rounded-full border border-[#00f0ff]/20"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                      />
                    </div>
                  </motion.div>
                  <div>
                    <div className="text-sm font-display font-bold bg-gradient-to-r from-[#00f0ff] to-[#3b82f6] bg-clip-text text-transparent">Co-Pilot</div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00e5c3] animate-pulse shadow-[0_0_4px_rgba(0,229,195,0.5)]" />
                      <span className="text-[9px] font-mono-accent text-[#00e5c3]/70 tracking-wider">YOUR WINGMAN</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => { setIsOpen(false); setExpression("idle"); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6b7394]/70 hover:text-[#f0f0f5] hover:bg-[#1e1e2e]/50 transition-all min-h-[36px] min-w-[36px]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[320px]">
                {messages.map((msg) => {
                  const IconComp = msg.icon || Sparkles;
                  const accent = getAccentColor(msg.type);
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex justify-start"
                    >
                      <div className="w-5 h-5 rounded-full flex-shrink-0 mr-2 mt-0.5 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${accent}, #3b82f6)`, boxShadow: `0 0 8px ${accent}40` }}>
                        <IconComp className="w-3 h-3 text-white" />
                      </div>
                      <div
                        className="max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-body border"
                        style={{ background: `${accent}08`, borderColor: `${accent}20`, color: "#e8eaf6" }}
                      >
                        {msg.content}
                      </div>
                    </motion.div>
                  );
                })}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="w-5 h-5 rounded-full flex-shrink-0 mr-2 mt-1 shadow-[0_0_8px_rgba(0,240,255,0.4)]" style={{ background: "linear-gradient(135deg, #ffc56b, #00f0ff)" }} />
                    <div className="bg-[#121a2e]/80 border border-[#1a1e2e] rounded-2xl px-4 py-3 flex gap-1.5">
                      <motion.div className="w-2 h-2 rounded-full bg-[#00f0ff]/60" animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                      <motion.div className="w-2 h-2 rounded-full bg-[#00f0ff]/60" animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }} />
                      <motion.div className="w-2 h-2 rounded-full bg-[#00f0ff]/60" animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 pt-2 border-t border-[#1a1e2e]">
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {[
                    { label: "Status", icon: Shield },
                    { label: "Leads", icon: Users },
                    { label: "Revenue", icon: TrendingUp },
                    { label: "Focus", icon: Zap },
                    { label: "Motivate", icon: Rocket },
                  ].map((action) => (
                    <button
                      key={action.label}
                      onClick={() => handleQuickAction(action.label)}
                      className="text-[10px] font-mono-accent px-2.5 py-1 rounded-full border border-[#00f0ff]/15 text-[#00f0ff]/70 hover:text-[#00f0ff] hover:border-[#00f0ff]/40 hover:bg-[#00f0ff]/5 hover:shadow-[0_0_8px_rgba(0,240,255,0.15)] transition-all flex items-center gap-1"
                    >
                      <action.icon className="w-3 h-3" />
                      {action.label}
                    </button>
                  ))}
                </div>
                <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask your Co-Pilot..."
                    className="flex-1 bg-[#04060e]/80 border border-[#1a1e2e] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#f0f0f5] font-body placeholder:text-[#6b7394]/30 focus:border-[#00f0ff]/40 focus:outline-none focus:ring-1 focus:ring-[#00f0ff]/20 focus:shadow-[0_0_12px_rgba(0,240,255,0.1)] transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isTyping}
                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00f0ff] to-[#3b82f6] flex items-center justify-center text-[#04060e] hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none font-bold"
                  >
                    <Zap className="w-4 h-4" />
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