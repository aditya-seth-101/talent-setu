import { API_BASE_URL } from "./constants";
import {
  clearSessionCookies,
  getSessionTokens,
  setSessionCookies,
} from "./auth-cookies";
import type { CurrentUserResponse, PublicRole, TokenPair } from "@/types/api";

async function requestCurrentUser(accessToken: string) {
  return fetch(`${API_BASE_URL}/api/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
}

async function refreshWithToken(
  refreshToken: string
): Promise<TokenPair | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { tokens: TokenPair };
    await setSessionCookies(data.tokens);
    return data.tokens;
  } catch (error) {
    console.error("Failed to refresh session", error);
    return null;
  }
}

export async function fetchCurrentUser(): Promise<CurrentUserResponse | null> {
  const { accessToken, refreshToken } = await getSessionTokens();

  if (!accessToken && !refreshToken) {
    return null;
  }

  const attemptFetch = async (token: string) => {
    try {
      const response = await requestCurrentUser(token);
      if (response.ok) {
        return (await response.json()) as CurrentUserResponse;
      }

      if (response.status === 401) {
        return null;
      }

      throw new Error(`Unexpected status: ${response.status}`);
    } catch (error) {
      console.error("Failed to fetch current user", error);
      return null;
    }
  };

  if (accessToken) {
    const currentUser = await attemptFetch(accessToken);
    if (currentUser) {
      return currentUser;
    }
  }

  if (!refreshToken) {
    await clearSessionCookies();
    return null;
  }

  const refreshed = await refreshWithToken(refreshToken);
  if (!refreshed) {
    await clearSessionCookies();
    return null;
  }

  const retry = await attemptFetch(refreshed.accessToken);
  if (!retry) {
    await clearSessionCookies();
  }
  return retry;
}

export async function fetchAssignableRoles(): Promise<PublicRole[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/roles`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to load roles: ${response.status}`);
    }

    const data = (await response.json()) as { roles: PublicRole[] };
    return data.roles;
  } catch (error) {
    console.error("Failed to fetch roles", error);
    return [];
  }
}

export async function revokeSession(refreshToken?: string) {
  if (!refreshToken) {
    await clearSessionCookies();
    return;
  }

  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
  } catch (error) {
    console.error("Failed to revoke session", error);
  } finally {
    await clearSessionCookies();
  }
}
