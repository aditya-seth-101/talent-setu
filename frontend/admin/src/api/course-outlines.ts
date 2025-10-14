import type {
  CourseOutlineListResponse,
  ListCourseOutlineParams,
  UpdateCourseOutlineReviewPayload,
  CourseOutlineSummary,
  CourseOutlineDetailResponse,
} from "../types/course-outline";

const DEFAULT_BASE_URL = "http://localhost:3000";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL as string | undefined
)?.replace(/\/$/, "");

function buildQuery(params: ListCourseOutlineParams): string {
  const url = new URLSearchParams();

  if (!params) {
    return url.toString();
  }

  const { status, technology, search, page, limit } = params;

  if (Array.isArray(status)) {
    status.forEach((value) => url.append("status", value));
  } else if (status) {
    url.set("status", status);
  }

  if (technology) {
    url.set("technology", technology);
  }

  if (search) {
    url.set("search", search);
  }

  if (page) {
    url.set("page", String(page));
  }

  if (limit) {
    url.set("limit", String(limit));
  }

  return url.toString();
}

function resolveBaseUrl(): string {
  return API_BASE_URL && API_BASE_URL.length > 0
    ? API_BASE_URL
    : DEFAULT_BASE_URL;
}

async function handleResponse<T>(response: Response): Promise<T> {
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

export async function fetchCourseOutlines(
  params: ListCourseOutlineParams,
  signal?: AbortSignal
): Promise<CourseOutlineListResponse> {
  const baseUrl = resolveBaseUrl();
  const query = buildQuery(params);
  const url = `${baseUrl}/api/courses/outlines${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    signal,
  });

  return handleResponse<CourseOutlineListResponse>(response);
}

export async function updateCourseOutlineStatus(
  id: string,
  payload: UpdateCourseOutlineReviewPayload
): Promise<CourseOutlineSummary> {
  const baseUrl = resolveBaseUrl();
  const url = `${baseUrl}/api/courses/outlines/${id}/status`;

  const response = await fetch(url, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await handleResponse<{ outline: CourseOutlineSummary }>(
    response
  );

  return data.outline;
}

export async function fetchCourseOutlineById(
  id: string,
  signal?: AbortSignal
): Promise<CourseOutlineSummary> {
  const baseUrl = resolveBaseUrl();
  const url = `${baseUrl}/api/courses/outlines/${id}`;

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    signal,
  });

  const data = await handleResponse<CourseOutlineDetailResponse>(response);
  return data.outline;
}
