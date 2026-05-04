"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import Image from "next/image";
import AnimatedSection, { AnimationVariant } from "./AnimatedSection";
import HolographicCard from "./motion/HolographicCard";

const categories = ["All", "Web Design", "Web App", "E-Commerce", "AI/ML"];

const projects = [
  { title: "Aurora Finance", cat: "Web App", desc: "Real-time financial dashboard with AI-powered insights and predictive analytics for investment managers.", tags: ["Next.js", "TypeScript", "Supabase"], colSpan: "md:col-span-7", img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80", color: "#00f0ff" },
  { title: "Nomad Market", cat: "E-Commerce", desc: "Multi-vendor marketplace with smart checkout, real-time inventory, and AI-driven product recommendations.", tags: ["React", "Stripe", "Node.js"], colSpan: "md:col-span-5", img: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80", color: "#3b82f6" },
  { title: "Zenith Studio", cat: "Web Design", desc: "Award-winning portfolio with immersive 3D experiences and custom CMS for creative professionals.", tags: ["Three.js", "GSAP", "WebGL"], colSpan: "md:col-span-5", img: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80", color: "#00e5c3" },
  { title: "Pulse Health", cat: "Web App", desc: "HIPAA-compliant telehealth platform with video calls, patient records, and appointment scheduling.", tags: ["Next.js", "WebRTC", "PostgreSQL"], colSpan: "md:col-span-7", img: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80", color: "#00f0ff" },
  { title: "Bolt Fitness", cat: "E-Commerce", desc: "High-conversion fitness store with subscriptions, workout tracking, and personalized plans.", tags: ["Shopify", "React", "Tailwind"], colSpan: "md:col-span-6", img: "https://images.unsplash.com/photo-1534438327276-14e5300c27cd?w=800&q=80", color: "#3b82f6" },
  { title: "Prism Creative", cat: "Web Design", desc: "Digital agency showcase with custom CMS, dynamic animations, and a stunning visual identity.", tags: ["Next.js", "Sanity", "Motion"], colSpan: "md:col-span-6", img: "https://images.unsplash.com/photo-1542744094-3a31f272c490?w=800&q=80", color: "#00e5c3" },
];

export default function Portfolio() {
  const [active, setActive] = useState("All");
  const filtered = active === "All" ? projects : projects.filter((p) => p.cat === active);

  return (
    <section id="portfolio" className="relative py-16 sm:py-20 md:py-28" style={{ background: "linear-gradient(180deg, #0a0e1a 0%, #0f0f1a 50%, #0a0e1a 100%)" }}>
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#00f0ff]/10 to-transparent" />
      <div className="container-wide">
        <AnimatedSection variant="clipUp">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12 md:mb-16">
            <div>
              <span className="section-label mb-4">Selected Work</span>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-display font-bold mt-4">
                Featured <span className="text-gradient">Projects</span>
              </h2>
              <p className="text-[#6b7394] text-sm sm:text-base font-body mt-3 max-w-md">
                Real results for real businesses. Every project built to perform, convert, and scale.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setActive(c)}
                  className={`px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-mono-accent tracking-wider uppercase rounded-md transition-all duration-200 min-h-[36px] ${
                    active === c ? "bg-[#3b82f6] text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]" : "text-[#a0a0b0]/75 border border-[#1e1e2e] hover:text-[#a0a0b0] hover:border-[#3b82f6]/20"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5">
          {filtered.map((p, i) => {
            const variant = i === 0 ? "clipLeft" : i === 1 ? "clipRight" : "scaleUp";
            return (
              <AnimatedSection key={p.title} className={`col-span-12 ${p.colSpan}`} delay={i * 0.06} variant={variant as AnimationVariant}>
                <HolographicCard color={p.color}>
                  <div className="card overflow-hidden group min-h-[220px] sm:min-h-[260px] md:min-h-[320px] relative">
                  <div className="absolute inset-0">
                    <Image src={p.img} alt={p.title} fill className="object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500 scale-105 group-hover:scale-100" style={{ transition: "opacity 0.5s ease, transform 0.7s ease" }} />
                    <div className="absolute inset-0 bg-[#0a0e1a]/85 group-hover:bg-[#0a0e1a]/75 transition-colors duration-500" />
                  </div>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `linear-gradient(135deg, ${p.color}05 0%, transparent 50%)` }} />
                  <div className="relative z-10 h-full flex flex-col justify-between p-5 md:p-7">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="tag" style={{ color: `${p.color}99`, borderColor: `${p.color}25` }}>{p.cat}</span>
                        <div className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 border border-white/5 group-hover:border-[#3b82f6]/20">
                          <ExternalLink className="w-3.5 h-3.5 text-[#3b82f6]" />
                        </div>
                      </div>
                      <h3 className="text-xl md:text-2xl font-display font-bold text-[#f0f0f5] mb-1.5 group-hover:text-gradient transition-all duration-300">{p.title}</h3>
                      <p className="text-sm text-[#a0a0b0]/80 leading-relaxed">{p.desc}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-5">
                      {p.tags.map((t) => (<span key={t} className="tag">{t}</span>))}
                    </div>
                  </div>
                </div>
                </HolographicCard>
              </AnimatedSection>
            );
          })}
        </div>

        <AnimatedSection className="mt-10 md:mt-14" variant="fadeUp">
          <div className="text-center">
            <p className="text-[#6b7394]/70 text-sm mb-4">Want to see what we can build for you?</p>
            <a href="#contact" className="btn-secondary">
              Start Your Project
            </a>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
