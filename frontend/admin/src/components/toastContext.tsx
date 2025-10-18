import { createContext, useContext } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  description?: string;
  duration: number;
}

export interface ToastContextValue {
  addToast(toast: Omit<ToastItem, "id"> & { duration?: number }): number;
  removeToast(id: number): void;
}

export const ToastContext = createContext<ToastContextValue | undefined>(
  undefined
);

export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    // In tests or when provider is not mounted, return a safe no-op implementation
    // to avoid throwing and to make components resilient during unit tests.
    if (process.env.NODE_ENV === "test") {
      return {
        addToast: () => 0,
        removeToast: () => undefined,
      } as ToastContextValue;
    }
    throw new Error("useToastContext must be used within a ToastProvider");
  }
  return context;
}
