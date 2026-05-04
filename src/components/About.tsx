"use client";

import AnimatedSection from "./AnimatedSection";
import CountUp from "./CountUp";
import { Rocket, Target, Cpu, Layers, Zap, Shield, Users, Globe } from "lucide-react";

const reasons = [
  { icon: Rocket, title: "Lightning Delivery", desc: "Streamlined process from concept to launch. We hit deadlines without sacrificing quality." },
  { icon: Target, title: "Conversion Science", desc: "Every element crafted to turn visitors into customers. Data-driven design that delivers measurable results." },
  { icon: Cpu, title: "Cutting-Edge Stack", desc: "React, Next.js, AI integration — we stay ahead so your business stays ahead of the competition." },
  { icon: Layers, title: "Scalable Architecture", desc: "From MVP to enterprise platform, solutions engineered to scale seamlessly with your growth." },
  { icon: Zap, title: "Performance Obsessed", desc: "Sub-second loads, perfect Lighthouse scores. Speed isn't a feature — it's a foundation." },
  { icon: Shield, title: "Security First", desc: "Enterprise-grade security baked into every layer. SSL, monitoring, automated backups included." },
];

const stats = [
  { value: 99.9, suffix: "%", label: "Uptime Guarantee", decimals: 1 },
  { value: 1.5, suffix: "s", label: "Avg Load Time", decimals: 1, prefix: "<" },
  { value: 24, suffix: "/7", label: "AI Monitoring" },
  { value: 100, suffix: "%", label: "Code Ownership" },
];

const values = [
  { icon: Users, label: "Client-Centric" },
  { icon: Globe, label: "Global Reach" },
  { icon: Zap, label: "Performance" },
  { icon: Shield, label: "Security" },
];

export default function About() {
  return (
    <section id="about" className="relative py-16 sm:py-20 md:py-28 bg-[#0a0e1a]">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#00f0ff]/8 to-transparent" />
      <div className="container-wide">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
          <div className="lg:col-span-5">
            <AnimatedSection variant="clipLeft">
              <span className="section-label mb-4">Why Choose Us</span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold mt-4 mb-6">
                Why <span className="text-gradient">Ember?</span>
              </h2>
              <p className="text-[#a0a0b0] font-body leading-relaxed mb-4">
                We&apos;re not just developers — we&apos;re digital architects. We engineer experiences
                that perform exceptionally, built on cutting-edge technology and driven by results.
              </p>
              <p className="text-[#a0a0b0]/70 text-sm font-body leading-relaxed mb-6">
                Based in South Africa, serving clients globally. Every project gets the same
                obsessive attention to detail, whether you&apos;re a startup or enterprise.
              </p>
            </AnimatedSection>

            <AnimatedSection delay={0.15} variant="clipLeft">
              <div className="grid grid-cols-2 gap-3 mt-8">
                {stats.map((s) => (
                  <div key={s.label} className="card p-4 group">
                    <div className="text-2xl font-display font-bold text-gradient">
                      <CountUp end={s.value} duration={2000} suffix={s.suffix} prefix={s.prefix || ""} decimals={s.decimals || 0} />
                    </div>
                    <div className="text-xs font-mono-accent text-[#a0a0b0] tracking-wider uppercase mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.2} variant="fadeUp">
              <div className="flex flex-wrap gap-2 mt-6">
                {values.map((v) => (
                  <div key={v.label} className="flex items-center gap-2 px-3 py-1.5 border border-[#121a2e] rounded-full">
                    <v.icon className="w-3 h-3 text-[#00f0ff]/70" />
                    <span className="text-[10px] font-mono-accent text-[#6b7394]/75 tracking-wider uppercase">{v.label}</span>
                  </div>
                ))}
              </div>
            </AnimatedSection>
          </div>

          <div className="lg:col-span-7 space-y-3">
            {reasons.map((r, i) => (
              <AnimatedSection key={r.title} delay={i * 0.06} variant={i % 2 === 0 ? "fadeRight" : "fadeLeft"}>
                <div className="card p-4 md:p-5 flex gap-4 items-start group">
                  <div className="w-9 h-9 rounded-lg bg-[#3b82f6]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#3b82f6]/15 transition-colors">
                    <r.icon className="w-4 h-4 text-[#3b82f6]" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-[#f0f0f5] text-sm mb-1 group-hover:text-gradient transition-all duration-300">{r.title}</h3>
                    <p className="text-sm text-[#a0a0b0]/70 font-body leading-relaxed">{r.desc}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
