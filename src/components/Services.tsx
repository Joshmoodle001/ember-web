"use client";

import {
  Bot, MessageSquare, Globe, Mail, Code2, Shield,
  ShoppingCart, Palette, TrendingUp, Smartphone, Cpu, Cloud,
} from "lucide-react";
import AnimatedSection, { AnimationVariant } from "./AnimatedSection";
import GlitchText from "./GlitchText";

const services = [
  { icon: Bot, title: "AI Bots & Chatbots", desc: "Custom AI-powered bots that handle inquiries, automate workflows, and provide 24/7 intelligent assistance across WhatsApp, web, and social channels.", tags: ["GPT", "WhatsApp", "Live Chat"], featured: true, accent: "#00f0ff" },
  { icon: Cpu, title: "AI Integration", desc: "Embed intelligence into your workflows with custom AI models, predictive analytics, and machine learning solutions tailored to your business.", tags: ["OpenAI", "Machine Learning", "Automation"], featured: true, accent: "#3b82f6" },
  { icon: Globe, title: "Website Development", desc: "High-performance websites built for conversion — landing pages, corporate sites, e-commerce, membership platforms, and progressive web apps.", tags: ["Next.js", "React", "Full-Stack"], featured: true, accent: "#00e5c3" },
  { icon: MessageSquare, title: "Live Chat Systems", desc: "Smart conversational interfaces that engage visitors instantly. Multilingual, context-aware, and seamlessly integrated.", tags: ["WhatsApp", "Website Chat", "AI-Powered"] },
  { icon: Mail, title: "Email Hosting", desc: "Professional custom domain email with enterprise reliability. Google Workspace, Microsoft 365, or self-hosted solutions.", tags: ["Google Workspace", "Microsoft 365"] },
  { icon: Cloud, title: "Hosting & Infrastructure", desc: "Blazing-fast hosting with 99.9% uptime. Full deployment, monitoring, and scaling on Vercel, AWS, or dedicated servers.", tags: ["Vercel", "AWS", "SSL & CDN"] },
  { icon: ShoppingCart, title: "E-Commerce Solutions", desc: "Conversion-optimized online stores with secure payments, inventory management, real-time analytics, and subscription support.", tags: ["Stripe", "Shopify", "WooCommerce"] },
  { icon: TrendingUp, title: "SEO & Performance", desc: "Dominate search rankings with technical SEO, content strategy, and sub-second load times that boost conversions.", tags: ["Core Web Vitals", "Technical SEO"] },
  { icon: Palette, title: "UI/UX Design", desc: "Intuitive interfaces backed by data-driven design thinking, thorough user research, and conversion-focused layouts.", tags: ["Research", "Prototyping", "Figma"] },
  { icon: Smartphone, title: "Responsive Design", desc: "Pixel-perfect across every viewport — mobile to ultrawide. Touch-optimized and accessibility-compliant.", tags: ["Mobile-First", "PWA", "Accessible"] },
  { icon: Shield, title: "Security & Maintenance", desc: "Round-the-clock protection, real-time monitoring, automated backups, and proactive performance optimization.", tags: ["SSL", "Monitoring", "24/7"] },
  { icon: Code2, title: "Custom Web Apps", desc: "Bespoke applications built from the ground up — fast, secure, infinitely scalable, and designed to grow with you.", tags: ["TypeScript", "Full-Stack", "API"] },
];

const websiteTypes = [
  "Landing Pages", "Corporate & Business", "E-Commerce", "SaaS Platforms",
  "Membership Sites", "Blogs & Publishing", "Portfolios", "Restaurant & Hospitality",
  "Real Estate", "Learning Management", "Job Boards", "Event & Booking",
];

export default function Services() {
  return (
    <section id="services" className="relative py-16 sm:py-20 md:py-28 grid-bg" style={{ background: "linear-gradient(180deg, #04060e 0%, #070b15 50%, #04060e 100%)" }}>
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#00f0ff]/10 to-transparent" />
      <div className="container-wide">
        <AnimatedSection variant="clipUp">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12 md:mb-16">
            <div>
              <span className="section-label mb-4">CAPABILITIES</span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold mt-4">
                Future-Proof <GlitchText text="Solutions" className="text-gradient" />
              </h2>
              <p className="text-[#6b7394] text-sm sm:text-base font-body mt-3 max-w-lg">
                AI-powered systems that evolve with your business. From intelligent chatbots to enterprise-grade platforms.
              </p>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection className="mb-10 md:mb-14" variant="clipCenter">
          <div className="card-featured p-5 md:p-7 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#00f0ff]/40 to-transparent" />
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-[#00f0ff] animate-pulse" />
              <span className="text-[10px] font-mono-accent tracking-[0.2em] uppercase text-[#00f0ff]/70">
                AI-POWERED CORE
              </span>
            </div>
            <p className="text-[#e8eaf6]/80 text-sm md:text-base font-body mb-4 max-w-3xl leading-relaxed">
              Custom <strong className="text-[#00f0ff]">AI chatbots</strong> that transform customer engagement.
              Automate conversations, qualify leads, and provide instant responses around the clock.
              Your business, running on intelligence — powered by GPT-4, trained on your data.
            </p>
            <div className="flex flex-wrap gap-2">
              {["Custom AI Chatbots", "WhatsApp Bots", "Live Chat", "Lead Qualification", "Appointment Booking", "Multilingual"].map((t) => (
                <span key={t} className="tag text-[#00f0ff]/75 border-[#00f0ff]/10">{t}</span>
              ))}
            </div>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {services.map((s, i) => {
            const variant = i % 3 === 0 ? "fadeUp" : i % 3 === 1 ? "scaleUp" : "slideBlur";
            return (
              <AnimatedSection key={s.title} delay={i * 0.04} variant={variant as AnimationVariant}>
                <div className={`card p-5 md:p-6 group h-full ${s.featured ? "" : ""}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center group-hover:bg-[#00f0ff]/[0.12] transition-colors" style={{ background: s.featured ? `${s.accent}08` : "rgba(0,240,255,0.05)" }}>
                      <s.icon className="w-5 h-5" style={{ color: s.featured ? s.accent : "rgba(0,240,255,0.7)" }} />
                    </div>
                    {s.featured && (
                      <span className="text-[9px] font-mono-accent tracking-[0.15em] uppercase text-[#00f0ff]/70 border border-[#00f0ff]/10 px-2 py-0.5 rounded">
                        CORE
                      </span>
                    )}
                  </div>
                  <h3 className="text-base md:text-lg font-display font-bold text-[#e8eaf6] mb-2 group-hover:text-gradient transition-all duration-300">
                    {s.title}
                  </h3>
                  <p className="text-sm text-[#6b7394]/80 leading-relaxed mb-4">{s.desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {s.tags.map((t) => (
                      <span key={t} className="tag">{t}</span>
                    ))}
                  </div>
                </div>
              </AnimatedSection>
            );
          })}
        </div>

        <AnimatedSection className="mt-10 md:mt-14" variant="clipUp">
          <div className="card p-5 md:p-7 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#3b82f6]/20 to-transparent" />
            <h3 className="text-lg font-display font-bold text-[#e8eaf6] mb-2">Every Type of Website. One AI-Powered Platform.</h3>
            <p className="text-sm text-[#6b7394]/80 mb-4">From landing pages to enterprise platforms — all powered by intelligent systems.</p>
            <div className="flex flex-wrap gap-2 md:gap-3">
              {websiteTypes.map((t) => (
                <span key={t} className="px-3 py-1.5 text-sm text-[#6b7394]/70 border border-[#121a2e] rounded-lg hover:border-[#00f0ff]/20 hover:text-[#00f0ff] transition-all duration-200 cursor-default">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
