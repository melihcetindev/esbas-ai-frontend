"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle2, XCircle, X } from "lucide-react";

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: (() => void) | null;
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

interface ModalContextType {
  showConfirm: (title: string, message: string, onConfirm: () => void, confirmLabel?: string) => void;
  showToast: (message: string, type: "success" | "error") => void;
  isDarkMode: boolean;
  setIsDarkMode: (v: boolean) => void;
}

const ModalContext = createContext<ModalContextType | null>(null);

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used within ModalProvider");
  return ctx;
}

// ═══════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════

let toastCounter = 0;

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // ── Confirm State ──
  const [confirm, setConfirm] = useState<ConfirmState>({
    isOpen: false,
    title: "",
    message: "",
    confirmLabel: "Onayla",
    onConfirm: null,
  });

  const showConfirm = useCallback(
    (title: string, message: string, onConfirm: () => void, confirmLabel?: string) => {
      setConfirm({ isOpen: true, title, message, onConfirm, confirmLabel: confirmLabel || "Sil" });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    confirm.onConfirm?.();
    setConfirm((prev) => ({ ...prev, isOpen: false }));
  }, [confirm]);

  const handleCancel = useCallback(() => {
    setConfirm((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // ── Toast State ──
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ModalContext.Provider value={{ showConfirm, showToast, isDarkMode, setIsDarkMode }}>
      {children}

      {/* ═══════════ CONFIRM DIALOG ═══════════ */}
      <AnimatePresence>
        {confirm.isOpen && (
          <motion.div
            key="confirm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={handleCancel}
            />

            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
              className={`relative w-full max-w-md rounded-3xl border p-8 shadow-2xl backdrop-blur-2xl ${
                isDarkMode
                  ? "bg-slate-900/80 border-white/10 text-white"
                  : "bg-white/90 border-slate-200 text-slate-800"
              }`}
            >
              {/* Icon */}
              <div className="flex items-center justify-center mb-5">
                <div className={`p-3.5 rounded-2xl ${isDarkMode ? "bg-red-500/15" : "bg-red-50"}`}>
                  <AlertTriangle className="w-7 h-7 text-red-500" />
                </div>
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-center tracking-tight mb-2">
                {confirm.title}
              </h3>
              <p
                className={`text-sm text-center leading-relaxed mb-8 ${
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                {confirm.message}
              </p>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className={`flex-1 py-3 px-5 rounded-xl font-semibold text-sm tracking-wide transition-all ${
                    isDarkMode
                      ? "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
                  }`}
                >
                  İptal
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-3 px-5 rounded-xl font-bold text-sm tracking-wide bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600 hover:-translate-y-0.5 transition-all"
                >
                  {confirm.confirmLabel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════ TOAST NOTIFICATIONS ═══════════ */}
      <div className="fixed top-6 right-6 z-[9998] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 80, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.9 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
              className={`pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-xl backdrop-blur-xl max-w-sm ${
                toast.type === "success"
                  ? isDarkMode
                    ? "bg-emerald-950/80 border-emerald-500/20 text-emerald-300"
                    : "bg-white border-emerald-200 text-emerald-700 shadow-emerald-500/10"
                  : isDarkMode
                  ? "bg-red-950/80 border-red-500/20 text-red-300"
                  : "bg-white border-red-200 text-red-700 shadow-red-500/10"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 flex-shrink-0" />
              )}
              <p className="text-sm font-semibold leading-snug flex-1">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-lg hover:bg-black/10 transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5 opacity-50" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ModalContext.Provider>
  );
}
