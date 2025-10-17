import type {
  CourseOutlineListResponse,
  ListCourseOutlineParams,
  UpdateCourseOutlineReviewPayload,
  CourseOutlineSummary,
  CourseOutlineDetailResponse,
  PublishCourseOutlineResponse,
} from "../types/course-outline";
import { handleApiResponse, resolveApiBaseUrl } from "./client";

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

export async function fetchCourseOutlines(
  params: ListCourseOutlineParams,
  signal?: AbortSignal
): Promise<CourseOutlineListResponse> {
  const baseUrl = resolveApiBaseUrl();
  const query = buildQuery(params);
  const url = `${baseUrl}/api/courses/outlines${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    signal,
  });

  return handleApiResponse<CourseOutlineListResponse>(response);
}

export async function updateCourseOutlineStatus(
  id: string,
  payload: UpdateCourseOutlineReviewPayload
): Promise<CourseOutlineSummary> {
  const baseUrl = resolveApiBaseUrl();
  const url = `${baseUrl}/api/courses/outlines/${id}/status`;

  const response = await fetch(url, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await handleApiResponse<{ outline: CourseOutlineSummary }>(
    response
  );

  return data.outline;
}

export async function fetchCourseOutlineById(
  id: string,
  signal?: AbortSignal
): Promise<CourseOutlineSummary> {
  const baseUrl = resolveApiBaseUrl();
  const url = `${baseUrl}/api/courses/outlines/${id}`;

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    signal,
  });

  const data = await handleApiResponse<CourseOutlineDetailResponse>(response);
  return data.outline;
}

export async function publishCourseOutline(
  id: string
): Promise<PublishCourseOutlineResponse> {
  const baseUrl = resolveApiBaseUrl();
  const url = `${baseUrl}/api/courses/outlines/${id}/publish`;

  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
  });

  return handleApiResponse<PublishCourseOutlineResponse>(response);
}
