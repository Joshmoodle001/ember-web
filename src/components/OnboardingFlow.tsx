"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Sparkles, Globe, Bot, Palette, Rocket, Check, User, Zap, Shield, Search, BarChart3, Server, Mail, X } from "lucide-react";
import { LucideIcon } from "lucide-react";
import OnboardingAvatar from "./OnboardingAvatar";

// Deterministic pseudo-random based on index (pure)
function pseudoRandom(seed: number): number {
  const a = 9301;
  const c = 49297;
  const m = 233280;
  const value = (seed * a + c) % m;
  return value / m;
}

const steps = [
  {
    id: "greet",
    icon: User,
    title: "Let's Get to Know You",
    subtitle: "First things first — what's your name?",
    field: { key: "name", type: "text", placeholder: "Your name", label: "Your Name" },
    bgEffect: "particles",
    accentColor: "#00f0ff",
  },
  {
    id: "project",
    icon: Globe,
    title: "What Are You Building?",
    subtitle: "Choose the type that fits your vision best.",
    field: {
      key: "projectType",
      type: "select",
      label: "Project Type",
      options: [
        { value: "", label: "Select your project type" },
        { value: "website", label: "Website" },
        { value: "web-app", label: "Web Application" },
        { value: "ecommerce", label: "Online Store" },
        { value: "chatbot", label: "AI Chatbot" },
        { value: "ai-integration", label: "AI Integration" },
        { value: "redesign", label: "Redesign" },
        { value: "other", label: "Something Else" },
      ],
    },
    bgEffect: "circuits",
    accentColor: "#3b82f6",
  },
  {
    id: "services",
    icon: Sparkles,
    title: "Supercharge Your Project",
    subtitle: "Pick all the services that interest you.",
    field: {
      key: "services",
      type: "multiselect",
      label: "Services",
      options: [
        { value: "ai-chatbot", label: "AI Chatbot", icon: Bot as LucideIcon },
        { value: "seo", label: "SEO Optimization", icon: Search as LucideIcon },
        { value: "ecommerce", label: "E-Commerce", icon: Zap as LucideIcon },
        { value: "hosting", label: "Hosting & SSL", icon: Server as LucideIcon },
        { value: "email", label: "Email Setup", icon: Mail as LucideIcon },
        { value: "design", label: "UI/UX Design", icon: Palette as LucideIcon },
        { value: "maintenance", label: "Ongoing Support", icon: Shield as LucideIcon },
        { value: "analytics", label: "Analytics", icon: BarChart3 as LucideIcon },
      ],
    },
    bgEffect: "float",
    accentColor: "#00e5c3",
  },
  {
    id: "budget",
    icon: Rocket,
    title: "Investment Level",
    subtitle: "This helps us tailor the perfect solution for you.",
    field: {
      key: "budget",
      type: "select",
      label: "Budget Range",
      options: [
        { value: "", label: "Select your budget" },
        { value: "under-10k", label: "Under R10,000" },
        { value: "10k-25k", label: "R10,000 — R25,000" },
        { value: "25k-50k", label: "R25,000 — R50,000" },
        { value: "50k-100k", label: "R50,000 — R100,000" },
        { value: "100k+", label: "R100,000+" },
      ],
    },
    bgEffect: "ember",
    accentColor: "#ff6b2b",
  },
  {
    id: "contact",
    icon: Palette,
    title: "Stay Connected",
    subtitle: "We'll send you a personalized proposal based on your answers.",
    field: {
      key: "contact",
      type: "dual",
      fields: [
        { key: "email", type: "email", placeholder: "you@company.com", label: "Email" },
        { key: "company", type: "text", placeholder: "Your company (optional)", label: "Company" },
      ],
    },
    bgEffect: "pulse",
    accentColor: "#f7a541",
  },
];

function StepEffect({ type }: { type: string }) {
  // useMemo is called unconditionally to satisfy React Hooks rules
  const particles = useMemo(() =>
    type === "particles"
      ? [...Array(20)].map((_, i) => ({
          left: pseudoRandom(i) * 100,
          top: pseudoRandom(i + 20) * 100,
          duration: 3 + pseudoRandom(i + 40) * 2,
          delay: pseudoRandom(i + 60) * 2,
        }))
      : [],
    [type]
  );

  const sparks = useMemo(() =>
    type === "ember"
      ? [...Array(12)].map((_, i) => ({
          width: 3 + pseudoRandom(i) * 4,
          height: 3 + pseudoRandom(i + 12) * 4,
          left: 10 + pseudoRandom(i + 24) * 80,
          bottom: pseudoRandom(i + 36) * 30,
          y: -200 - pseudoRandom(i + 48) * 300,
          duration: 3 + pseudoRandom(i + 60) * 3,
          delay: pseudoRandom(i + 72) * 4,
        }))
      : [],
    [type]
  );

  if (type === "particles" && particles.length) {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-[#00f0ff]/30"
            style={{ left: `${p.left}%`, top: `${p.top}%` }}
            animate={{ y: [0, -30, 0], opacity: [0.2, 0.6, 0.2], scale: [1, 1.5, 1] }}
            transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          />
        ))}
      </div>
    );
  }

  if (type === "circuits") {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.04]">
        <svg className="w-full h-full" viewBox="0 0 400 400" preserveAspectRatio="none">
          <motion.path d="M0 200 L100 200 L120 120 L200 120 L220 200 L320 200 L340 300 L400 300" fill="none" stroke="#3b82f6" strokeWidth="1" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2 }} />
          <motion.path d="M0 300 L80 300 L100 220 L180 220 L200 100 L400 100" fill="none" stroke="#3b82f6" strokeWidth="1" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.5, delay: 0.3 }} />
          <motion.path d="M0 50 L150 50 L170 150 L400 150" fill="none" stroke="#3b82f6" strokeWidth="1" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, delay: 0.6 }} />
        </svg>
      </div>
    );
  }

  if (type === "float") {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[{ color: "#00e5c3", size: 6, x: "15%", y: "20%", dur: 4 },
          { color: "#00f0ff", size: 4, x: "75%", y: "15%", dur: 3.5 },
          { color: "#3b82f6", size: 5, x: "80%", y: "70%", dur: 5 },
          { color: "#00e5c3", size: 3, x: "25%", y: "75%", dur: 4.5 }].map((dot, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{ width: dot.size * 4, height: dot.size * 4, left: dot.x, top: dot.y, background: dot.color, opacity: 0.08 }}
            animate={{ y: [0, -20, 0], x: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: dot.dur, repeat: Infinity, delay: i * 0.5, ease: "easeInOut" }}
          />
        ))}
      </div>
    );
  }

  if (type === "ember" && sparks.length) {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {sparks.map((s, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: s.width,
              height: s.height,
              left: `${s.left}%`,
              bottom: `${s.bottom}%`,
              background: i % 2 === 0 ? "#ff6b2b" : "#f7a541",
            }}
            animate={{ y: [0, s.y, 0], opacity: [0, 0.6, 0], scale: [0.5, 1, 0.3] }}
            transition={{ duration: s.duration, repeat: Infinity, delay: s.delay, ease: "easeOut" }}
          />
        ))}
      </div>
    );
  }

  if (type === "pulse") {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 sm:w-60 sm:h-60 rounded-full border border-[#f7a541]/10"
          animate={{ scale: [1, 1.5, 2], opacity: [0.2, 0.1, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 sm:w-60 sm:h-60 rounded-full border border-[#f7a541]/10"
          animate={{ scale: [1, 1.5, 2], opacity: [0.2, 0.1, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeOut", delay: 1 }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 sm:w-60 sm:h-60 rounded-full border border-[#f7a541]/10"
          animate={{ scale: [1, 1.5, 2], opacity: [0.2, 0.1, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeOut", delay: 2 }}
        />
      </div>
    );
  }
  return null;
}

export default function OnboardingFlow({ onComplete, onExit }: { onComplete: (data: Record<string, string>) => void; onExit: () => void }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState<Record<string, string>>({ name: "", projectType: "", services: "", budget: "", email: "", company: "" });
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [typing, setTyping] = useState(true);

  const currentStep = steps[step];
  const isLast = step === steps.length - 1;

  useEffect(() => {
    const timer = setTimeout(() => setTyping(false), 1200);
    return () => clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (data.name && step === 0) return;
  }, [data.name, step]);

  const personalizedName = data.name || "there";

  const canProceed = () => {
    if (step === 0) return data.name.trim().length > 0;
    if (step === 1) return data.projectType !== "";
    if (step === 2) return selectedServices.length > 0;
    if (step === 3) return data.budget !== "";
    if (step === 4) return data.email.trim().length > 0;
    return true;
  };

  const handleNext = () => {
    if (step === 2) {
      setData({ ...data, services: selectedServices.join(", ") });
    }
    if (isLast) {
      onComplete(data);
      return;
    }
    setDirection(1);
    setStep(step + 1);
  };

  const handleBack = () => {
    setDirection(-1);
    setStep(step - 1);
  };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  const stepMsg = step === 0 ? "Hey there! I'm Ember, your digital companion. What should I call you?"
    : step === 1 ? `Nice to meet you, ${personalizedName}! What kind of project are you dreaming of?`
    : step === 2 ? `Great choice, ${personalizedName}! Which services should we include?`
    : step === 3 ? `Almost there, ${personalizedName}! What's your investment range?`
    : `Last step, ${personalizedName}! How can we reach you?`;

  return (
    <motion.div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{ background: "linear-gradient(135deg, #04060e 0%, #0a0e1a 50%, #04060e 100%)" }}
    >
      <div className="absolute inset-0 grid-bg opacity-[0.03] pointer-events-none" />

      <StepEffect type={currentStep.bgEffect} />

      <button
        onClick={onExit}
        className="fixed top-5 right-5 z-[500] flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#0a0e1a] border border-[#6b7394]/50 text-[#8b8fa8] hover:text-[#00f0ff] hover:border-[#00f0ff]/50 hover:bg-[#121a2e] transition-all duration-200 shadow-lg cursor-pointer text-sm font-medium"
        title="Skip onboarding"
      >
        <X className="w-4 h-4" />
        <span>Skip</span>
      </button>

      <div className="w-full max-w-lg relative z-10">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          {steps.map((_, i) => (
            <div key={i} className="flex items-center">
              <motion.div
                className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-mono-accent font-bold transition-all duration-300 ${
                  i < step ? "bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30"
                    : i === step ? "bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/50 shadow-[0_0_15px_rgba(0,240,255,0.15)]"
                    : "bg-[#121a2e] text-[#6b7394]/70 border border-[#1e1e2e]"
                }`}
              >
                {i < step ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : i + 1}
              </motion.div>
              {i < steps.length - 1 && (
                <div className={`w-6 sm:w-10 h-px mx-1 sm:mx-2 transition-colors duration-300 ${i < step ? "bg-[#00f0ff]/30" : "bg-[#1e1e2e]"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="min-h-[340px] sm:min-h-[380px] flex flex-col">
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="flex-1 flex flex-col"
          >
            <div className="flex flex-col items-center mb-6 sm:mb-8">
              <OnboardingAvatar
                step={step}
                speaking={typing}
                message={typing ? "" : (step === 0 || step === 4 ? stepMsg : "")}
              />
            </div>

            <div className="text-center mb-5 sm:mb-6">
              <motion.h3
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="text-lg sm:text-xl md:text-2xl font-display font-bold text-[#f0f0f5]"
              >
                {currentStep.title}
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="text-xs sm:text-sm text-[#6b7394] mt-1.5"
              >
                {currentStep.subtitle}
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="flex-1"
            >
              {currentStep.field.type === "text" && (
                <div className="max-w-sm mx-auto">
                  <input
                    type="text"
                    value={data[currentStep.field.key] || ""}
                    onChange={(e) => setData({ ...data, [currentStep.field.key]: e.target.value })}
                    placeholder={currentStep.field.placeholder}
                    className="input-field text-center text-base sm:text-lg"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && canProceed() && handleNext()}
                  />
                </div>
              )}

              {currentStep.field.type === "select" && (
                <div className="max-w-sm mx-auto">
                  <select
                    value={data[currentStep.field.key] || ""}
                    onChange={(e) => setData({ ...data, [currentStep.field.key]: e.target.value })}
                    className="input-field text-center appearance-none cursor-pointer"
                  >
                    {currentStep.field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-[#14141e]">{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {currentStep.field.type === "multiselect" && (
                <div className="grid grid-cols-2 gap-2 sm:gap-3 max-w-md mx-auto">
                  {currentStep.field.options?.map((opt) => {
                    const selected = selectedServices.includes(opt.value);
                    const IconComp = 'icon' in opt ? opt.icon : null;
                    return (
                      <motion.button
                        key={opt.value}
                        onClick={() => {
                          setSelectedServices(prev =>
                            selected ? prev.filter(s => s !== opt.value) : [...prev, opt.value]
                          );
                        }}
                        className={`p-3 sm:p-4 rounded-xl text-xs sm:text-sm font-body transition-all duration-200 min-h-[48px] text-left flex items-center gap-2 ${
                          selected
                            ? "bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#f0f0f5] shadow-[0_0_20px_rgba(0,240,255,0.08)]"
                            : "bg-[#0a0e1a]/80 border border-[#121a2e] text-[#6b7394] hover:border-[#00f0ff]/20 hover:text-[#a0a0b0]"
                        }`}
                        whileTap={{ scale: 0.97 }}
                      >
                        {selected && <Check className="w-3.5 h-3.5 text-[#00f0ff] flex-shrink-0" />}
                        {IconComp && <IconComp className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />}
                        <span>{opt.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {currentStep.field.type === "dual" && (
                <div className="max-w-sm mx-auto space-y-3">
                  {currentStep.field.fields?.map((f) => (
                    <input
                      key={f.key}
                      type={f.type}
                      value={data[f.key] || ""}
                      onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      className="input-field"
                      autoFocus={f.key === "email"}
                      onKeyDown={(e) => e.key === "Enter" && canProceed() && handleNext()}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>

        <div className="flex items-center justify-between mt-4 sm:mt-6">
          <motion.button
            onClick={handleBack}
            className={`flex items-center gap-1.5 text-xs sm:text-sm text-[#6b7394]/80 hover:text-[#6b7394] transition-colors min-h-[44px] px-3 ${step === 0 ? "invisible" : ""}`}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </motion.button>

          <motion.button
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex items-center gap-2 px-5 sm:px-6 py-3 bg-gradient-to-r from-[#00f0ff] to-[#3b82f6] text-[#04060e] font-display font-bold text-xs sm:text-sm tracking-wider uppercase rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed min-h-[44px] shadow-[0_0_20px_rgba(0,240,255,0.15)]"
            style={{ background: isLast ? "linear-gradient(135deg, #ff6b2b, #f7a541)" : undefined,
              boxShadow: isLast ? "0 0 20px rgba(255,107,43,0.2)" : undefined }}
            whileTap={{ scale: 0.97 }}
          >
            {isLast ? (
              <>
                <Rocket className="w-4 h-4" />
                Launch My Project
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}