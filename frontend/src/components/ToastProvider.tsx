import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type ToastType = "success" | "error" | "info";

type Toast = { id: string; type: ToastType; message: string };

type ToastContextValue = {
  pushToast: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const estilos: Record<ToastType, string> = {
  success: "border-emerald-400/40 bg-emerald-500/90 text-white",
  error: "border-rose-400/40 bg-rose-500/90 text-white",
  info: "border-sky-400/40 bg-sky-500/90 text-white",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((type: ToastType, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);

  const value = useMemo<ToastContextValue>(
    () => ({
      pushToast,
      success: (message) => pushToast("success", message),
      error: (message) => pushToast("error", message),
      info: (message) => pushToast("info", message),
    }),
    [pushToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.type === "error" ? "alert" : "status"}
            className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur ${estilos[toast.type]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <span>{toast.message}</span>
              <button type="button" onClick={() => dismiss(toast.id)} className="text-white/90 transition hover:text-white" aria-label="Cerrar notificación">
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast debe usarse dentro de ToastProvider");
  return context;
}