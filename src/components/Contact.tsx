"use client";

import { useState, FormEvent } from "react";
import { Send, Loader2, Mail, MapPin, Phone, ArrowUpRight, Clock, CheckCircle2 } from "lucide-react";
import AnimatedSection from "./AnimatedSection";

export default function Contact({ prefilledData }: { prefilledData?: Record<string, string> | null }) {
  const [formData, setFormData] = useState(() => {
    if (!prefilledData) return { name: "", email: "", company: "", service: "", budget: "", message: "" };
    const serviceMap: Record<string, string> = { website: "web-development", "web-app": "web-development", ecommerce: "e-commerce", chatbot: "ai-chatbots", "ai-integration": "ai-integration", redesign: "web-development", other: "" };
    const budgetMap: Record<string, string> = { "under-10k": "under-10k", "10k-25k": "10k-25k", "25k-50k": "25k-50k", "50k-100k": "50k-100k", "100k+": "100k+" };
    return {
      name: prefilledData.name || "",
      email: prefilledData.email || "",
      company: prefilledData.company || "",
      service: serviceMap[prefilledData.projectType] || "",
      budget: budgetMap[prefilledData.budget] || "",
      message: prefilledData.services ? `I'm interested in: ${prefilledData.services}` : "",
    };
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
      if (res.ok) { setStatus("success"); setFormData({ name: "", email: "", company: "", service: "", budget: "", message: "" }); } else { setStatus("error"); }
    } catch { setStatus("error"); }
  };

  return (
    <section id="contact" className="relative py-16 sm:py-20 md:py-28" style={{ background: "linear-gradient(180deg, #0a0e1a 0%, #0f0f1a 50%, #0a0e1a 100%)" }}>
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#ff6b2b]/10 to-transparent" />

      <div className="container-wide">
        <AnimatedSection variant="clipLeft">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12 md:mb-14">
            <div>
              <span className="section-label mb-4">Contact</span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold mt-4">
                Start Your <span className="text-gradient-ember">Project</span>
              </h2>
              <p className="max-w-lg text-[#6b7394] text-sm sm:text-base font-body mt-3">
                Ready to ignite your digital presence? Tell us your vision and we&apos;ll make it reality. Free strategy sessions available.
              </p>
            </div>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-8">
          <div className="lg:col-span-7">
            <AnimatedSection variant="fadeUp">
              <form onSubmit={handleSubmit} className="card p-4 sm:p-5 md:p-8 space-y-4 sm:space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Full Name *</label>
                    <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-field" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Email *</label>
                    <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input-field" placeholder="john@example.com" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Company</label>
                    <input type="text" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className="input-field" placeholder="Your Company" />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Service</label>
                    <select value={formData.service} onChange={(e) => setFormData({ ...formData, service: e.target.value })} className="input-field appearance-none cursor-pointer">
                      <option value="" className="bg-[#14141e]">Select service</option>
                      <option value="ai-chatbots" className="bg-[#14141e]">AI Bots &amp; Chatbots</option>
                      <option value="web-development" className="bg-[#14141e]">Website Development</option>
                      <option value="e-commerce" className="bg-[#14141e]">E-Commerce Solutions</option>
                      <option value="email-hosting" className="bg-[#14141e]">Email Hosting</option>
                      <option value="hosting" className="bg-[#14141e]">Hosting &amp; Infrastructure</option>
                      <option value="seo" className="bg-[#14141e]">SEO &amp; Performance</option>
                      <option value="design" className="bg-[#14141e]">UI/UX Design</option>
                      <option value="ai-integration" className="bg-[#14141e]">AI Integration</option>
                      <option value="maintenance" className="bg-[#14141e]">Security &amp; Maintenance</option>
                      <option value="custom-app" className="bg-[#14141e]">Custom Web App</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Budget Range</label>
                  <select value={formData.budget} onChange={(e) => setFormData({ ...formData, budget: e.target.value })} className="input-field appearance-none cursor-pointer">
                    <option value="" className="bg-[#14141e]">Select budget</option>
                    <option value="under-10k" className="bg-[#14141e]">Under R10,000</option>
                    <option value="10k-25k" className="bg-[#14141e]">R10,000 &ndash; R25,000</option>
                    <option value="25k-50k" className="bg-[#14141e]">R25,000 &ndash; R50,000</option>
                    <option value="50k-100k" className="bg-[#14141e]">R50,000 &ndash; R100,000</option>
                    <option value="100k+" className="bg-[#14141e]">R100,000+</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono-accent tracking-[0.15em] uppercase text-[#a0a0b0]/75 block mb-1.5">Project Details *</label>
                  <textarea required rows={4} value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="input-field resize-none" placeholder="Tell us about your project, goals, and timeline..." />
                </div>
                <button type="submit" disabled={status === "loading"} className="w-full btn-ember disabled:opacity-50 disabled:cursor-not-allowed">
                  {status === "loading" ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : status === "success" ? <><CheckCircle2 className="w-4 h-4" /> Message Sent!</> : <><Send className="w-4 h-4" /> Send Message</>}
                </button>
                {status === "success" && <p className="text-center text-green-400/80 text-sm mt-2">We&apos;ll respond within 24 hours.</p>}
                {status === "error" && <p className="text-center text-red-400/80 text-sm mt-2">Something went wrong. Please try again.</p>}
              </form>
            </AnimatedSection>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <AnimatedSection delay={0.1} variant="fadeRight">
              <div className="card p-5">
                <h3 className="font-display font-bold text-[#f0f0f5] mb-4">Get in Touch</h3>
                {[
                  { icon: Mail, label: "Email", value: "hello@emberweb.co.za", href: "mailto:hello@emberweb.co.za" },
                  { icon: Phone, label: "Phone", value: "+27 (0) 00 000 0000", href: "tel:+27000000000" },
                  { icon: MapPin, label: "Location", value: "South Africa & Remote", href: "#" },
                  { icon: Clock, label: "Response Time", value: "Within 24 hours", href: "#" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 mb-4 last:mb-0">
                    <div className="w-9 h-9 rounded-lg bg-[#ff6b2b]/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4 h-4 text-[#ff6b2b]" />
                    </div>
                    <div>
                      <div className="text-[10px] font-mono-accent text-[#a0a0b0]/70 tracking-wider uppercase">{item.label}</div>
                      <a href={item.href} className="text-sm text-[#a0a0b0] hover:text-[#ff6b2b] transition-colors">{item.value}</a>
                    </div>
                  </div>
                ))}
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.15} variant="scaleUp">
              <div className="card-featured p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#00f0ff]/20 to-transparent" />
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#00f0ff]/60 animate-pulse" />
                  <span className="text-[9px] font-mono-accent tracking-[0.2em] uppercase text-[#00f0ff]/75">FREE CONSULTATION</span>
                </div>
                <h3 className="font-display font-bold text-[#f0f0f5] mb-1.5">Free Strategy Call</h3>
                <p className="text-sm text-[#6b7394]/70 mb-4 leading-relaxed">Book a free 30-minute consultation. We&apos;ll analyze your digital presence and provide actionable recommendations — no strings attached.</p>
                <a href="#contact" className="inline-flex items-center gap-1.5 text-sm text-[#00f0ff] font-display font-bold hover:text-[#00f0ff]/80 transition-colors group">
                  Book a Call <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.2} variant="fadeUp">
              <div className="card p-4 text-center">
                <div className="flex justify-center gap-1 mb-2">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span key={i} className="text-[#f7a541] text-sm">&#9733;</span>
                  ))}
                </div>
                <p className="text-xs text-[#6b7394]/75">150+ projects delivered on time and on budget</p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </div>
    </section>
  );
}