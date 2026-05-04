"use client";

import { ArrowUp } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const h = () => setVisible(window.scrollY > 500);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 w-9 h-9 sm:w-9 sm:h-9 rounded-lg bg-[#14141e] border border-[#1e1e2e] flex items-center justify-center text-[#a0a0b0] hover:text-[#3b82f6] hover:border-[#3b82f6]/20 transition-colors min-h-[44px] min-w-[44px]"
          style={{ bottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        >
          <ArrowUp className="w-4 h-4" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}