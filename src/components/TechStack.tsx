"use client";

import AnimatedSection from "./AnimatedSection";

const technologies = [
  { name: "Next.js", category: "Framework", color: "#ffffff" },
  { name: "React", category: "Library", color: "#61DAFB" },
  { name: "TypeScript", category: "Language", color: "#3178C6" },
  { name: "Node.js", category: "Runtime", color: "#339933" },
  { name: "Tailwind CSS", category: "Styling", color: "#06B6D4" },
  { name: "Supabase", category: "Database", color: "#3FCF8E" },
  { name: "PostgreSQL", category: "Database", color: "#4169E1" },
  { name: "Vercel", category: "Deployment", color: "#ffffff" },
  { name: "AWS", category: "Cloud", color: "#FF9900" },
  { name: "OpenAI", category: "AI/ML", color: "#412991" },
  { name: "Stripe", category: "Payments", color: "#635BFF" },
  { name: "Framer Motion", category: "Animation", color: "#0055FF" },
  { name: "Figma", category: "Design", color: "#F24E1E" },
  { name: "GitHub", category: "DevOps", color: "#ffffff" },
  { name: "Docker", category: "DevOps", color: "#2496ED" },
  { name: "Shopify", category: "E-Commerce", color: "#96BF48" },
];

export default function TechStack() {
  return (
    <section className="relative py-12 sm:py-16 bg-[#04060e] overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#00f0ff]/8 to-transparent" />

      <div className="container-wide">
        <AnimatedSection variant="fadeUp">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[9px] font-mono-accent tracking-[0.2em] uppercase text-[#6b7394]/65">Powered By</span>
            <div className="flex-1 h-px bg-gradient-to-r from-[#121a2e] to-transparent" />
          </div>
        </AnimatedSection>

        <div className="relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#04060e] to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#04060e] to-transparent z-10" />

          <div className="flex animate-marquee">
            {[...technologies, ...technologies].map((tech, i) => (
              <div
                key={`${tech.name}-${i}`}
                className="flex-shrink-0 mx-3 flex items-center gap-2 px-4 py-2 border border-[#121a2e] rounded-lg hover:border-[#00f0ff]/15 transition-colors cursor-default group"
              >
                <div className="w-2 h-2 rounded-full opacity-40 group-hover:opacity-80 transition-opacity" style={{ background: tech.color }} />
                <span className="text-xs font-mono-accent text-[#6b7394]/70 group-hover:text-[#6b7394]/70 transition-colors tracking-wider whitespace-nowrap">
                  {tech.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
