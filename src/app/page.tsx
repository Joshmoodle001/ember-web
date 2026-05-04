"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import IntroOverlay from "@/components/IntroOverlay";
import OnboardingFlow from "@/components/OnboardingFlow";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import About from "@/components/About";
import Process from "@/components/Process";
import Portfolio from "@/components/Portfolio";
import HorizontalScroll from "@/components/HorizontalScroll";
import Testimonials from "@/components/Testimonials";
import Pricing from "@/components/Pricing";
import Contact from "@/components/Contact";
import FAQ from "@/components/FAQ";
import TechStack from "@/components/TechStack";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import WhatsAppButton from "@/components/WhatsAppButton";
import ScrollProgress from "@/components/ScrollProgress";
import ScanlineOverlay from "@/components/ScanlineOverlay";
import ScrollOrbs from "@/components/ScrollOrbs";
import EmberAvatar from "@/components/EmberAvatar";
import EmberTrail from "@/components/motion/EmberTrail";

export default function Home() {
  const [introDone, setIntroDone] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [contactData, setContactData] = useState<Record<string, string> | null>(null);
  const [siteVisible, setSiteVisible] = useState(false);

  const handleOnboardingComplete = useCallback((data: Record<string, string>) => {
    setContactData(data);
    setShowOnboarding(false);
    setTimeout(() => {
      setSiteVisible(true);
      setTimeout(() => {
        const el = document.getElementById("contact");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 600);
    }, 300);
  }, []);

  const handleIntroComplete = useCallback(() => {
    setIntroDone(true);
    setSiteVisible(true);
  }, []);

  return (
    <>
      {!introDone && <IntroOverlay onComplete={handleIntroComplete} />}

      <AnimatePresence>
        {showOnboarding && (
          <OnboardingFlow onComplete={handleOnboardingComplete} onExit={() => { setShowOnboarding(false); }} />
        )}
      </AnimatePresence>

      {introDone && (
        <motion.main
          className="relative"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: siteVisible ? 1 : 0, scale: siteVisible ? 1 : 1.05 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <ScrollProgress />
          <EmberTrail />
          <ScanlineOverlay />
          <ScrollOrbs />
          <Navbar />
          <Hero onLaunch={() => { setShowOnboarding(true); }} />
          <Services />
          <About />
          <Process />
          <Portfolio />
          <HorizontalScroll />
          <Testimonials />
          <Pricing />
          <Contact prefilledData={contactData} />
          <FAQ />
          <TechStack />
          <Footer />
          <ScrollToTop />
          <WhatsAppButton />
          <EmberAvatar />
        </motion.main>
      )}
    </>
  );
}