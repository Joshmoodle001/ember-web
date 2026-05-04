"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";
import AnimatedSection from "./AnimatedSection";
import GlitchText from "./GlitchText";

const faqs = [
  {
    q: "How long does it take to build a website?",
    a: "Most projects take 2–4 weeks from kickoff to launch. Landing pages can be delivered in as little as 5 days, while complex web applications may take 6–8 weeks. We'll give you a detailed timeline during our free strategy call.",
  },
  {
    q: "What's included in the pricing?",
    a: "Every package includes custom design, responsive development, SEO optimization, performance tuning, and 30 days of post-launch support. Higher tiers add features like AI chatbots, e-commerce integrations, and ongoing maintenance.",
  },
  {
    q: "Do you offer payment plans?",
    a: "Yes! We offer flexible payment plans — typically 50% upfront and 50% on delivery. For larger projects, we can arrange milestone-based payments. We accept EFT, credit card via PayFast, and other payment methods.",
  },
  {
    q: "What technologies do you use?",
    a: "We primarily build with Next.js, React, and TypeScript for front-ends, with Supabase for back-ends. We integrate AI via OpenAI and custom models. For e-commerce, we use Stripe, PayFast, Shopify, or WooCommerce depending on your needs.",
  },
  {
    q: "Can you add an AI chatbot to my existing website?",
    a: "Absolutely. Our AI chatbots can be embedded on any website — WordPress, Shopify, custom builds, you name it. They're trained on your business data, handle 80%+ of inquiries automatically, and hand off complex questions to your team.",
  },
  {
    q: "Do you provide hosting and maintenance?",
    a: "Yes. We offer managed hosting on Vercel, AWS, or dedicated servers with 99.9% uptime SLAs. Our maintenance plans include security monitoring, automated backups, performance optimization, and priority support.",
  },
  {
    q: "What happens after my site launches?",
    a: "You get 30 days of free support after launch. We also offer ongoing maintenance plans that include updates, security patches, content changes, performance monitoring, and monthly analytics reports.",
  },
  {
    q: "Can I see my project progress during development?",
    a: "Every client gets access to our client portal where you can track your project status in real time, view invoices, check payment history, and see milestone progress. We also provide regular updates via your preferred channel.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="relative py-16 sm:py-20 md:py-28" style={{ background: "linear-gradient(180deg, #04060e 0%, #070b15 50%, #04060e 100%)" }}>
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#ff6b2b]/10 to-transparent" />
      <div className="container-wide">
        <AnimatedSection variant="clipUp">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12 md:mb-16">
            <div>
              <span className="section-label mb-4">FAQ</span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold mt-4">
                Got <GlitchText text="Questions" className="text-gradient" />?
              </h2>
              <p className="text-[#6b7394] text-sm sm:text-base font-body mt-3 max-w-lg">
                Everything you need to know about working with Ember. Can&apos;t find your answer? Reach out directly.
              </p>
            </div>
            <a href="#contact" className="btn-secondary text-xs sm:text-sm whitespace-nowrap self-start md:self-auto">
              Ask Us Directly
            </a>
          </div>
        </AnimatedSection>

        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <AnimatedSection key={i} delay={i * 0.04} variant={i % 2 === 0 ? "fadeUp" : "slideBlur"}>
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className={`w-full text-left card p-4 sm:p-5 transition-all duration-300 ${isOpen ? "border-[#00f0ff]/20" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors duration-300 ${isOpen ? "bg-[#00f0ff]/15" : "bg-[#121a2e]"}`}>
                        <HelpCircle className={`w-4 h-4 transition-colors duration-300 ${isOpen ? "text-[#00f0ff]" : "text-[#6b7394]/75"}`} />
                      </div>
                      <h3 className={`text-sm sm:text-base font-display font-bold transition-colors duration-300 ${isOpen ? "text-[#f0f0f5]" : "text-[#a0a0b0]"}`}>
                        {faq.q}
                      </h3>
                    </div>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex-shrink-0 mt-1"
                    >
                      <ChevronDown className={`w-4 h-4 transition-colors duration-300 ${isOpen ? "text-[#00f0ff]" : "text-[#6b7394]/70"}`} />
                    </motion.div>
                  </div>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <p className="text-sm text-[#6b7394]/80 leading-relaxed mt-3 pl-11">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}