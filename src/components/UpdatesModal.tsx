"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";

interface UpdatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpdatesModal({ isOpen, onClose }: UpdatesModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative bg-card border border-border rounded-lg shadow-xl max-w-md w-full"
          >
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <h3 className="font-medium">AI Native Camp League</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-muted hover:text-foreground rounded hover:bg-surface-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 text-center">
              <p className="text-sm text-muted">
                AI Native Camp 참가자들을 위한 Claude Code 사용량 리더보드입니다.
              </p>
              <p className="text-sm text-muted mt-2">
                더 많이 쓰는 사람이 더 빠르게 성장합니다 🔥
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
