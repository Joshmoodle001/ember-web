"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import AnimatedSection from "./AnimatedSection";
import { ExternalLink, ArrowRight } from "lucide-react";

const projects = [
  { title: "Aurora Finance", cat: "Web App", desc: "Real-time financial dashboard with AI-powered insights and predictive analytics for investment managers.", tags: ["Next.js", "TypeScript", "Supabase"], img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80", color: "#00f0ff" },
  { title: "Nomad Market", cat: "E-Commerce", desc: "Multi-vendor marketplace with smart checkout, real-time inventory, and AI product recommendations.", tags: ["React", "Stripe", "Node.js"], img: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80", color: "#3b82f6" },
  { title: "Zenith Studio", cat: "Web Design", desc: "Award-winning portfolio with immersive 3D experiences and custom CMS for creative professionals.", tags: ["Three.js", "GSAP", "WebGL"], img: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80", color: "#00e5c3" },
  { title: "Pulse Health", cat: "Web App", desc: "HIPAA-compliant telehealth platform with video calls, patient records, and appointment scheduling.", tags: ["Next.js", "WebRTC", "PostgreSQL"], img: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80", color: "#00f0ff" },
  { title: "Bolt Fitness", cat: "E-Commerce", desc: "High-conversion fitness store with subscriptions, workout tracking, and personalized plans.", tags: ["Shopify", "React", "Tailwind"], img: "https://images.unsplash.com/photo-1534438327276-14e5300c27cd?w=800&q=80", color: "#3b82f6" },
];

export default function HorizontalScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]);

  return (
    <section ref={containerRef} className="relative py-16 sm:py-20 md:py-28 overflow-hidden bg-[#04060e]" style={{ background: "linear-gradient(180deg, #04060e 0%, #0a0e1a 50%, #04060e 100%)" }}>
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#00f0ff]/10 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#3b82f6]/10 to-transparent" />

      <div className="container-wide mb-10 sm:mb-14">
        <AnimatedSection>
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="section-label mb-4">Case Studies</span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold mt-4">
                Scroll to <span className="text-gradient">Explore</span>
              </h2>
              <p className="text-[#6b7394] text-sm sm:text-base font-body mt-3 max-w-md">
                Drag sideways or scroll to discover our latest projects and the results we deliver.
              </p>
            </div>
            <a href="#portfolio" className="hidden sm:flex items-center gap-2 text-[#a0a0b0]/70 hover:text-[#00f0ff]/70 transition-colors text-sm font-mono-accent tracking-wider uppercase">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </AnimatedSection>
      </div>

      <motion.div style={{ x }} className="flex gap-4 sm:gap-5 pl-4 sm:pl-6 md:pl-8 lg:pl-12 pr-8">
        {projects.map((p) => (
          <div
            key={p.title}
            className="flex-shrink-0 w-[280px] sm:w-[340px] md:w-[400px] card overflow-hidden group"
          >
            <div className="relative h-[200px] sm:h-[220px] md:h-[260px] overflow-hidden">
              <Image
                src={p.img}
                alt={p.title}
                fill
                className="object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#04060e] via-[#04060e]/40 to-transparent" />
              <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${p.color}08 0%, transparent 60%)` }} />
              <div className="absolute top-3 left-4">
                <span className="tag" style={{ color: `${p.color}99`, borderColor: `${p.color}25` }}>{p.cat}</span>
              </div>
            </div>
            <div className="p-4 sm:p-5 md:p-6">
              <h3 className="text-lg sm:text-xl font-display font-bold text-[#f0f0f5] mb-2 group-hover:text-gradient transition-all duration-300">
                {p.title}
              </h3>
              <p className="text-sm text-[#6b7394]/70 mb-4 line-clamp-2 leading-relaxed">{p.desc}</p>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1.5">
                  {p.tags.map((t) => (
                    <span key={t} className="tag">{t}</span>
                  ))}
                </div>
                <div className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 border border-white/5 group-hover:border-[#3b82f6]/20">
                  <ExternalLink className="w-3 h-3 text-[#3b82f6]" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </motion.div>
    </section>
  );
}