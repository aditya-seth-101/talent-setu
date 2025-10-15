"use server";

import "server-only";
import { API_BASE_URL } from "./constants";
import { getSessionTokens } from "./auth-cookies";

export async function apiRequest(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const { accessToken } = await getSessionTokens();
  const headers = new Headers(init?.headers);

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}
