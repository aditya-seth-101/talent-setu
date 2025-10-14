"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useState } from "react";
import { signupAction, type AuthFormState } from "@/actions/auth";
import type { PublicRole } from "@/types/api";

const initialState: AuthFormState = {};

export function SignupForm({
  roles,
  redirectTo,
}: {
  roles: PublicRole[];
  redirectTo?: string;
}) {
  const [state, formAction, isPending] = useActionState(
    signupAction,
    initialState
  );
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");

  function passwordStrength(pw: string) {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return Math.min(score, 3);
  }
  const strength = passwordStrength(passwordValue);

  const target = redirectTo ?? "/dashboard";

  return (
    <form
      action={formAction}
      className="flex w-full max-w-2xl flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
      aria-labelledby="signup-heading"
    >
      <input type="hidden" name="redirectTo" value={target} />
      <div className="space-y-2">
        <h1
          id="signup-heading"
          className="text-2xl font-semibold text-zinc-900"
        >
          Create account
        </h1>
        <p className="text-sm text-zinc-500">
          Start learning, run assessments, and track your progress across Talent
          Setu.
        </p>
      </div>

      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
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
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              minLength={8}
              required
              disabled={isPending}
              aria-required
              value={passwordValue}
              onChange={(e) => setPasswordValue(e.target.value)}
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
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1">
              <div className="h-2 w-full rounded-md bg-zinc-100">
                <div
                  className={`h-2 rounded-md ${
                    strength === 0
                      ? "w-1/4 bg-red-400"
                      : strength === 1
                      ? "w-1/2 bg-amber-400"
                      : strength === 2
                      ? "w-3/4 bg-emerald-400"
                      : "w-full bg-emerald-600"
                  }`}
                />
              </div>
            </div>
            <div className="text-xs text-zinc-600">
              {passwordValue.length === 0
                ? ""
                : strength === 0
                ? "Very weak"
                : strength === 1
                ? "Weak"
                : strength === 2
                ? "Good"
                : "Strong"}
            </div>
          </div>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
          Confirm password
          <input
            className="rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter password"
            minLength={8}
            required
            disabled={isPending}
          />
        </label>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-zinc-700">
          Choose your role
        </legend>
        <p className="text-sm text-zinc-500">
          Select the roles that describe how you&apos;ll use the platform. You
          can always request additional roles later.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {roles.length === 0 ? (
            <p className="text-sm text-amber-600">
              Roles are not available right now. Please contact support.
            </p>
          ) : (
            roles.map((role) => (
              <label
                key={role.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 p-3 hover:border-indigo-300"
              >
                <input
                  type="checkbox"
                  name="roles"
                  value={role.slug}
                  defaultChecked={role.slug === "student"}
                  className="mt-1 h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                  disabled={isPending}
                />
                <span>
                  <span className="block text-sm font-semibold text-zinc-800">
                    {role.name}
                  </span>
                  {role.description ? (
                    <span className="mt-1 block text-sm text-zinc-500">
                      {role.description}
                    </span>
                  ) : null}
                </span>
              </label>
            ))
          )}
        </div>
      </fieldset>

      <button
        type="submit"
        className="inline-flex h-11 items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
        disabled={isPending || roles.length === 0}
      >
        {isPending ? "Creating account…" : "Sign up"}
      </button>

      <p className="text-sm text-zinc-500">
        Already have an account?{" "}
        <Link
          href={{
            pathname: "/login",
            query: redirectTo ? { from: redirectTo } : undefined,
          }}
          className="font-medium text-indigo-600 hover:text-indigo-500"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
