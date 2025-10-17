const DEFAULT_BASE_URL = "http://localhost:3000";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL as string | undefined
)?.replace(/\/$/, "");

export function resolveApiBaseUrl(): string {
  return API_BASE_URL && API_BASE_URL.length > 0
    ? API_BASE_URL
    : DEFAULT_BASE_URL;
}

export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await safeReadText(response);
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  const data = (await response.json()) as T;
  return data;
}

async function safeReadText(response: Response): Promise<string | undefined> {
  try {
    return await response.text();
  } catch (error) {
    console.warn("Failed to read response body", error);
    return undefined;
  }
}
