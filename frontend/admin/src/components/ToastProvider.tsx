import type { ReactNode } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { ToastContext } from "./toastContext";
import type { ToastContextValue } from "./toastContext";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  description?: string;
  duration: number;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const idRef = useRef(0);

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback<ToastContextValue["addToast"]>(
    ({ duration = 4000, ...toast }) => {
      idRef.current += 1;
      const id = idRef.current;
      setToasts((current) => [
        ...current,
        {
          id,
          duration,
          ...toast,
        },
      ]);

      const timer = setTimeout(() => removeToast(id), duration);
      timersRef.current.set(id, timer);

      return id;
    },
    [removeToast]
  );

  const value = useMemo<ToastContextValue>(
    () => ({ addToast, removeToast }),
    [addToast, removeToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <div className="toast-content">
              <strong>{toast.title}</strong>
              {toast.description && <p>{toast.description}</p>}
            </div>
            <button
              type="button"
              className="toast-dismiss"
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Note: useToastContext is provided from `toastContext.tsx` to keep this
// file export-only for the provider component (improves fast refresh).
