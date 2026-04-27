"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: ToastType, message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const toastColors = {
    success: { bg: "#0a1a0a", border: "#1a3a1a", text: "#4ade80" },
    error: { bg: "#1a0a0a", border: "#2a1a1a", text: "#f87171" },
    info: { bg: "#0a1a2a", border: "#1a2a3a", text: "#60a5fa" },
    warning: { bg: "#1a1200", border: "#2a2000", text: "#fbbf24" },
  };

  const icons = { success: "✓", error: "⚠", info: "i", warning: "!" };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: 68,
          right: 20,
          zIndex: 9998,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => {
          const c = toastColors[toast.type];
          return (
            <div
              key={toast.id}
              style={{
                background: c.bg,
                border: `1px solid ${c.border}`,
                color: c.text,
                borderRadius: 8,
                padding: "12px 16px",
                fontSize: 13,
                minWidth: 260,
                maxWidth: 380,
                pointerEvents: "auto",
                display: "flex",
                alignItems: "center",
                gap: 10,
                animation: "gp-toast-in 0.25s ease-out",
                fontFamily: "inherit",
                boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                {icons[toast.type]}
              </span>
              <span>{toast.message}</span>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes gp-toast-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
