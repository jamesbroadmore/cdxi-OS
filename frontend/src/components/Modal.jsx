import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "../lib/utils";

export default function Modal({ open, onClose, title, children, width = "md" }) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose?.(); };
    if (open) window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  const widths = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-10 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          data-testid="modal-backdrop"
        >
          <motion.div
            className={cn("glass rounded-2xl w-full p-6 mt-10", widths[width])}
            initial={{ y: 12, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 8, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            data-testid="modal"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl font-semibold">{title}</h3>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition" data-testid="modal-close">
                <X className="w-4 h-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
