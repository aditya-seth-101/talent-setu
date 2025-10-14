"use server";

import { redirect } from "next/navigation";
import { API_BASE_URL } from "@/lib/constants";
import { getSessionTokens, setSessionCookies } from "@/lib/auth-cookies";
import { revokeSession } from "@/lib/server-auth";
import type { LoginResponse, SignupResponse } from "@/types/api";
import type { Role } from "@/types/api";

export type AuthFormState = {
  error?: string;
};

const defaultState: AuthFormState = {};

function safeString(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" ? value.trim() : null;
}

function resolveRedirect(formData: FormData) {
  const target = safeString(formData.get("redirectTo"));
  if (!target || !target.startsWith("/")) {
    return "/dashboard";
  }
  return target;
}

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = safeString(formData.get("email"));
  const password = safeString(formData.get("password"));
  const redirectTo = resolveRedirect(formData);

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const message =
        typeof body?.message === "string" ? body.message : "Login failed";
      return { error: message };
    }

    const data = (await response.json()) as LoginResponse;
    await setSessionCookies(data.tokens);

    redirect(redirectTo);
  } catch (error) {
    console.error("Login failed", error);
    return { error: "Unable to login. Please try again." };
  }

  return defaultState;
}

export async function signupAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = safeString(formData.get("email"));
  const password = safeString(formData.get("password"));
  const confirmPassword = safeString(formData.get("confirmPassword"));
  const redirectTo = resolveRedirect(formData);

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  const roleValues = formData.getAll("roles");
  const roles = Array.from(
    new Set(
      roleValues
        .map((value) => (typeof value === "string" ? value : ""))
        .filter((value): value is Role => value.length > 0)
    )
  ) as Role[];

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, roles }),
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const message =
        typeof body?.message === "string"
          ? body.message
          : "Unable to create account";
      return { error: message };
    }

    const data = (await response.json()) as SignupResponse;
    await setSessionCookies(data.tokens);

    redirect(redirectTo);
  } catch (error) {
    console.error("Signup failed", error);
    return { error: "Unable to create account. Please try again." };
  }

  return defaultState;
}

export async function logoutAction() {
  const { refreshToken } = await getSessionTokens();
  await revokeSession(refreshToken ?? undefined);
  redirect("/login");
}
