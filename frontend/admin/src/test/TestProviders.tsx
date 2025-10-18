import React from "react";
import { vi } from "vitest";
import { ToastProvider } from "../components/ToastProvider";
import { ToastContext } from "../components/toastContext";

export function TestProviders({ children }: { children?: React.ReactNode }) {
  // Provide the real ToastProvider so components that rely on it render as expected.
  // eslint-disable-next-line no-console
  console.log("TestProviders mounted");
  return <ToastProvider>{children}</ToastProvider>;
}

export function mockToastContext() {
  // Useful helper to spy on toasts when needed by tests
  const addToast = vi.fn();
  const removeToast = vi.fn();
  const value = { addToast, removeToast } as unknown as React.ContextType<
    typeof ToastContext
  >;
  return { addToast, removeToast, value };
}
