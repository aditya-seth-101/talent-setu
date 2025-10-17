import { useCallback } from "react";
import { type ToastType, useToastContext } from "../components/toastContext";

interface ToastOptions {
  title: string;
  description?: string;
  duration?: number;
}

export function useToast() {
  const { addToast, removeToast } = useToastContext();

  const show = useCallback(
    (type: ToastType, { title, description, duration }: ToastOptions) =>
      addToast({
        type,
        title,
        description,
        duration: typeof duration === "number" ? duration : 4000,
      }),
    [addToast]
  );

  const success = useCallback(
    (title: string, description?: string, duration?: number) =>
      show("success", { title, description, duration }),
    [show]
  );

  const error = useCallback(
    (title: string, description?: string, duration?: number) =>
      show("error", { title, description, duration }),
    [show]
  );

  const info = useCallback(
    (title: string, description?: string, duration?: number) =>
      show("info", { title, description, duration }),
    [show]
  );

  return {
    show,
    success,
    error,
    info,
    dismiss: removeToast,
  } as const;
}
