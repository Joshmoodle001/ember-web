"use client";

import { useState, useEffect } from "react";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import Image from "next/image";
import AnimatedSection from "./AnimatedSection";

const testimonials = [
  { name: "Sarah Mitchell", role: "CEO, Aurora Finance", content: "Ember transformed our platform. User engagement increased 340% in the first quarter. Their AI integration was seamless and the results speak for themselves. Absolutely transformative.", rating: 5, img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80" },
  { name: "Marcus van der Berg", role: "Founder, Nomad Market", content: "The e-commerce solution exceeded every expectation. Checkout conversions jumped 65% within the first month. Their understanding of user experience is remarkable.", rating: 5, img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80" },
  { name: "Lisa Nkosi", role: "Director, Zenith Studio", content: "Working with Ember was like having a creative partner. Our portfolio site has won three design awards since launch. They truly understand the intersection of art and technology.", rating: 5, img: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&q=80" },
  { name: "David Chen", role: "CTO, Pulse Health", content: "Ember delivered a HIPAA-compliant platform that our patients love. Their technical expertise is unmatched — they handled complex requirements with elegance.", rating: 5, img: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80" },
  { name: "Priya Sharma", role: "Marketing Lead, TechFlow", content: "The AI chatbot Ember built for us handles 80% of customer queries automatically. It saved us countless hours and our customer satisfaction scores went through the roof.", rating: 5, img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80" },
  { name: "James Okafor", role: "Owner, Bolt Fitness", content: "From concept to launch in 3 weeks. The e-commerce store they built generates more revenue than our physical location. Best investment we've made.", rating: 5, img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80" },
];

export default function Testimonials() {
  const [current, setCurrent] = useState(0);
  const t = testimonials[current];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [current]);

  return (
    <section id="testimonials" className="relative py-16 sm:py-20 md:py-28 bg-[#0a0e1a]">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#00f0ff]/8 to-transparent" />
      <div className="container-wide">
        <AnimatedSection variant="clipUp">
          <div className="text-center mb-12 md:mb-16">
            <span className="section-label mb-4">Client Voices</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold mt-4 mb-4">
              What They <span className="text-gradient">Say</span>
            </h2>
            <p className="max-w-md mx-auto text-[#6b7394] text-sm sm:text-base">
              Real feedback from real clients. Results that speak louder than words.
            </p>
          </div>
        </AnimatedSection>

        <AnimatedSection variant="slideBlur">
          <div className="card-featured p-5 sm:p-6 md:p-10 relative">
            <Quote className="absolute top-4 sm:top-6 left-4 sm:left-6 w-8 h-8 sm:w-12 sm:h-12 text-[#3b82f6]/55" />

            <div className="relative z-10">
              <div className="flex gap-1 mb-6">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#f7a541] text-[#f7a541]" />
                ))}
              </div>
              <blockquote className="text-base sm:text-lg md:text-2xl font-display text-[#f0f0f5]/80 leading-relaxed mb-6 sm:mb-8 min-h-[60px] sm:min-h-[80px]">
                &ldquo;{t.content}&rdquo;
              </blockquote>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Image src={t.img} alt={t.name} width={40} height={40} className="rounded-lg object-cover" loading="lazy" />
                  <div>
                    <div className="font-display font-bold text-[#f0f0f5] text-sm">{t.name}</div>
                    <div className="text-[11px] font-mono-accent text-[#a0a0b0]">{t.role}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrent((c) => c === 0 ? testimonials.length - 1 : c - 1)} className="w-9 h-9 rounded-md border border-[#1e1e2e] flex items-center justify-center text-[#a0a0b0] hover:text-[#3b82f6] hover:border-[#3b82f6]/30 transition-colors min-h-[44px] min-w-[44px]">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] font-mono-accent text-[#6b7394]/70 min-w-[40px] text-center">{current + 1}/{testimonials.length}</span>
                  <button onClick={() => setCurrent((c) => c === testimonials.length - 1 ? 0 : c + 1)} className="w-9 h-9 rounded-md border border-[#1e1e2e] flex items-center justify-center text-[#a0a0b0] hover:text-[#3b82f6] hover:border-[#3b82f6]/30 transition-colors min-h-[44px] min-w-[44px]">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} className={`h-1.5 rounded-full transition-all duration-300 min-h-[24px] ${i === current ? "w-8 bg-[#3b82f6]" : "w-1.5 bg-[#1e1e2e] hover:bg-[#2a2a3a]"}`} />
            ))}
          </div>
        </AnimatedSection>

        <AnimatedSection className="mt-10 md:mt-14" variant="fadeUp">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: "340%", label: "Avg Engagement Boost" },
              { value: "65%", label: "Conversion Increase" },
              { value: "80%", label: "Query Automation" },
              { value: "3wk", label: "Avg Delivery Time" },
            ].map((stat) => (
              <div key={stat.label} className="card p-3 md:p-4 text-center">
                <div className="text-xl md:text-2xl font-display font-bold text-gradient">{stat.value}</div>
                <div className="text-[9px] font-mono-accent text-[#6b7394]/75 tracking-wider uppercase mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
