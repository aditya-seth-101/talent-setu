"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useState } from "react";
import { loginAction, type AuthFormState } from "@/actions/auth";

const initialState: AuthFormState = {};

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState
  );
  const [showPassword, setShowPassword] = useState(false);

  const target = redirectTo ?? "/dashboard";

  return (
    <form
      action={formAction}
      className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
      aria-labelledby="login-heading"
    >
      <input type="hidden" name="redirectTo" value={target} />
      <div>
        <h1 id="login-heading" className="text-2xl font-semibold text-zinc-900">
          Welcome back
        </h1>
        <p className="text-sm text-zinc-500">
          Enter your credentials to access your dashboard.
        </p>
      </div>

      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
        Email
        <input
          className="rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          disabled={isPending}
          aria-required
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
        Password
        <div className="relative">
          <input
            className="w-full rounded-md border border-zinc-300 px-3 py-2 pr-12 text-base text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            minLength={8}
            required
            disabled={isPending}
            aria-required
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </label>

      <button
        type="submit"
        className="inline-flex h-11 items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
        disabled={isPending}
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-sm text-zinc-500">
        Don&apos;t have an account?{" "}
        <Link
          href={{
            pathname: "/signup",
            query: target ? { from: target } : undefined,
          }}
          className="font-medium text-indigo-600 hover:text-indigo-500"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
