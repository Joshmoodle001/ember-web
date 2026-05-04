"use client";

import { MessageSquare, Palette, Code2, Rocket, ArrowRight } from "lucide-react";
import AnimatedSection from "./AnimatedSection";
import { CircuitBoard } from "./motion/CircuitTrace";

const steps = [
  {
    icon: MessageSquare,
    step: "01",
    title: "Discovery & Strategy",
    desc: "We dive deep into your business goals, target audience, and competitive landscape. A free strategy session to map your digital roadmap.",
    details: ["Business Analysis", "Competitor Research", "Goal Setting", "Timeline Planning"],
    accent: "#00f0ff",
  },
  {
    icon: Palette,
    step: "02",
    title: "Design & Prototype",
    desc: "Data-driven design that converts. We create pixel-perfect prototypes you can interact with before a single line of code is written.",
    details: ["Wireframing", "UI/UX Design", "Interactive Prototype", "Client Review"],
    accent: "#3b82f6",
  },
  {
    icon: Code2,
    step: "03",
    title: "Build & Integrate",
    desc: "Clean, performant code built with cutting-edge tech. AI integration, e-commerce, chatbots — whatever your project demands.",
    details: ["Development Sprint", "AI Integration", "Testing & QA", "Performance Tuning"],
    accent: "#00e5c3",
  },
  {
    icon: Rocket,
    step: "04",
    title: "Launch & Grow",
    desc: "Seamless deployment with ongoing monitoring, optimization, and support. We don't just launch — we help you scale.",
    details: ["Deployment", "Monitoring", "SEO Optimization", "Ongoing Support"],
    accent: "#ff6b2b",
  },
];

export default function Process() {
  return (
    <section id="process" className="relative py-16 sm:py-20 md:py-28 bg-[#04060e]" style={{ background: "linear-gradient(180deg, #04060e 0%, #0a0e1a 50%, #04060e 100%)" }}>
      <CircuitBoard className="opacity-20" nodes={6} />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#3b82f6]/10 to-transparent" />
      <div className="container-wide">
        <AnimatedSection variant="clipUp">
          <div className="text-center mb-12 md:mb-16">
            <span className="section-label mb-4">HOW WE WORK</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold mt-4 mb-4">
              From Idea to <span className="text-gradient">Launch</span>
            </h2>
            <p className="max-w-lg mx-auto text-[#6b7394] text-sm sm:text-base font-body">
              A proven process refined over 150+ projects. Transparent, collaborative, and built around your success.
            </p>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {steps.map((step, i) => (
            <AnimatedSection key={step.step} delay={i * 0.1} variant={i % 2 === 0 ? "fadeUp" : "scaleUp"}>
              <div className="card p-5 md:p-6 group h-full relative">
                <div
                  className="absolute top-0 left-0 w-full h-[2px] rounded-t-xl opacity-60"
                  style={{ background: `linear-gradient(90deg, transparent, ${step.accent}, transparent)` }}
                />

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: `${step.accent}10` }}
                  >
                    <step.icon className="w-5 h-5" style={{ color: step.accent }} />
                  </div>
                  <span
                    className="text-2xl font-display font-bold opacity-20"
                    style={{ color: step.accent }}
                  >
                    {step.step}
                  </span>
                </div>

                <h3 className="text-base md:text-lg font-display font-bold text-[#e8eaf6] mb-2 group-hover:text-gradient transition-all duration-300">
                  {step.title}
                </h3>
                <p className="text-sm text-[#6b7394]/70 leading-relaxed mb-4">{step.desc}</p>

                <div className="space-y-1.5">
                  {step.details.map((d) => (
                    <div key={d} className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full" style={{ background: step.accent, opacity: 0.4 }} />
                      <span className="text-[11px] font-mono-accent text-[#6b7394]/75 tracking-wider">{d}</span>
                    </div>
                  ))}
                </div>

                {i < steps.length - 1 && (
                  <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                    <ArrowRight className="w-5 h-5 text-[#121a2e]" />
                  </div>
                )}
              </div>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection className="mt-10 md:mt-14" variant="fadeUp">
          <div className="card-featured p-5 md:p-7 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#00f0ff]/20 to-transparent" />
            <div>
              <h3 className="text-lg font-display font-bold text-[#e8eaf6] mb-1">Ready to start your project?</h3>
              <p className="text-sm text-[#6b7394]/70">Book a free 30-minute strategy session. No obligations, just actionable insights.</p>
            </div>
            <a href="#contact" className="btn-primary whitespace-nowrap flex-shrink-0">
              Book Free Call
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
