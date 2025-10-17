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
    throw new Error("useToastContext must be used within a ToastProvider");
  }
  return context;
}
