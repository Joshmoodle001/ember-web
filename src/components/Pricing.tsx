"use client";

import { Check } from "lucide-react";
import AnimatedSection, { AnimationVariant } from "./AnimatedSection";

const plans = [
  {
    name: "Spark",
    price: "R9,999",
    period: "once-off",
    desc: "For startups ready to ignite their online presence with a professional, conversion-focused website.",
    features: [
      "5-page responsive website",
      "Custom design & branding",
      "Mobile optimization",
      "SEO foundation",
      "Contact form integration",
      "SSL certificate",
      "30 days post-launch support",
    ],
    popular: false,
    cta: "Get Started",
  },
  {
    name: "Blaze",
    price: "R24,999",
    period: "once-off",
    desc: "For growing businesses demanding more conversions, advanced features, and AI-powered tools.",
    features: [
      "Up to 15 pages",
      "Custom animations & interactions",
      "E-commerce (up to 100 products)",
      "Advanced SEO & analytics",
      "CMS integration",
      "AI chatbot integration",
      "Performance optimization",
      "Payment gateway setup",
      "90 days priority support",
    ],
    popular: true,
    cta: "Get Started",
  },
  {
    name: "Inferno",
    price: "Custom",
    period: "quote",
    desc: "Enterprise-grade solutions for those who demand the best. Fully custom, unlimited potential.",
    features: [
      "Unlimited pages & features",
      "Custom web applications",
      "AI/ML integration & training",
      "Multi-language support",
      "Advanced security & compliance",
      "CI/CD & DevOps pipeline",
      "Dedicated project manager",
      "Priority 24/7 support",
      "SLA guarantee",
      "Performance monitoring",
    ],
    popular: false,
    cta: "Get a Quote",
  },
];

const addons = [
  "WhatsApp AI Bot — from R2,999",
  "Monthly Maintenance — from R999/mo",
  "Email Hosting Setup — from R499",
  "SEO Retainer — from R1,499/mo",
];

export default function Pricing() {
  return (
    <section id="pricing" className="relative py-16 sm:py-20 md:py-28" style={{ background: "linear-gradient(180deg, #0a0e1a 0%, #0f0f1a 50%, #0a0e1a 100%)" }}>
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#3b82f6]/10 to-transparent" />
      <div className="container-wide">
        <AnimatedSection variant="clipCenter">
          <div className="text-center mb-12 md:mb-16">
            <span className="section-label mb-4">Pricing</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold mt-4 mb-4">
              Invest in Your <span className="text-gradient">Future</span>
            </h2>
            <p className="max-w-md mx-auto text-[#a0a0b0] text-sm sm:text-base">
              Transparent pricing. No hidden fees. Payment plans available on all packages.
            </p>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 items-start">
          {plans.map((plan, i) => {
            const variant = i === 1 ? "scaleUp" : "clipUp";
            return (
              <AnimatedSection key={plan.name} delay={i * 0.1} variant={variant as AnimationVariant}>
                <div className={`relative h-full flex flex-col ${plan.popular ? "card-featured p-6 md:p-8" : "card p-6 md:p-8"}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-[#00f0ff] to-[#3b82f6] text-[#04060e] text-[10px] font-mono-accent tracking-widest uppercase rounded-full font-bold">
                      Most Popular
                    </div>
                  )}
                  <div className="mb-6">
                    <span className="text-[10px] font-mono-accent tracking-[0.2em] uppercase text-[#a0a0b0]/70">{plan.name}</span>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className={`text-3xl md:text-4xl font-display font-bold ${plan.popular ? "text-gradient" : "text-[#f0f0f5]"}`}>{plan.price}</span>
                    </div>
                    <span className="text-[10px] font-mono-accent text-[#a0a0b0]/65 tracking-wider">{plan.period === "once-off" ? "one-time payment" : "based on scope"}</span>
                  </div>
                  <p className="text-sm text-[#a0a0b0]/75 mb-6 leading-relaxed">{plan.desc}</p>
                  <div className="space-y-2.5 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-start gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#3b82f6]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5 text-[#3b82f6]" />
                        </div>
                        <span className="text-sm text-[#a0a0b0]/80">{f}</span>
                      </div>
                    ))}
                  </div>
                  <a href="#contact" className={`text-center py-3 px-6 font-display font-bold text-sm tracking-wider uppercase rounded-lg transition-all duration-200 block min-h-[44px] ${plan.popular ? "btn-primary" : "border border-[#1e1e2e] text-[#a0a0b0] hover:border-[#3b82f6]/30 hover:text-[#3b82f6]"}`}>
                    {plan.cta}
                  </a>
                </div>
              </AnimatedSection>
            );
          })}
        </div>

        <AnimatedSection className="mt-8" variant="fadeUp">
          <div className="card p-5 md:p-6">
            <h4 className="text-sm font-display font-bold text-[#e8eaf6] mb-3">Available Add-ons</h4>
            <div className="flex flex-wrap gap-3">
              {addons.map((addon) => (
                <span key={addon} className="px-3 py-1.5 text-xs text-[#6b7394]/80 border border-[#121a2e] rounded-lg">
                  {addon}
                </span>
              ))}
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection className="mt-6 text-center" variant="fadeUp">
          <p className="text-[#a0a0b0]/80 text-[10px] font-mono-accent tracking-wider">All prices in ZAR. Payment plans available. Prices exclude VAT. Prices may vary based on project complexity.</p>
        </AnimatedSection>
      </div>
    </section>
  );
}
