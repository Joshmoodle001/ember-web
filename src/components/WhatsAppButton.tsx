"use client";

import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function WhatsAppButton() {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.a
      href="https://wa.me/27000000000?text=Hi%20Ember%20Web!%20I%27m%20interested%20in%20your%20services."
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="fixed bottom-5 left-5 sm:bottom-6 sm:left-6 z-40 flex items-center gap-2 bg-[#25D366] text-white rounded-lg pl-3 pr-4 py-2.5 shadow-lg shadow-[#25D366]/20 hover:shadow-[#25D366]/40 transition-all min-h-[44px]"
      style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 2, type: "spring", stiffness: 200 }}
    >
      <MessageCircle className="w-5 h-5" />
      <AnimatePresence>
        {hovered && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="text-sm font-display font-bold whitespace-nowrap overflow-hidden"
          >
            Chat with us
          </motion.span>
        )}
      </AnimatePresence>
    </motion.a>
  );
}