import { handleApiResponse, resolveApiBaseUrl } from "./client";
import type {
  TechnologyRequest,
  TechnologyRequestCreateResponse,
  TechnologyRequestDecisionPayload,
  TechnologyRequestListResponse,
  TechnologySearchResponse,
  TechnologySummary,
} from "../types/technology";

function buildQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    search.set(key, String(value));
  });
  const query = search.toString();
  return query.length > 0 ? `?${query}` : "";
}

export async function searchTechnologyDirectoryApi(
  term: string,
  limit = 10,
  signal?: AbortSignal
) {
  const baseUrl = resolveApiBaseUrl();
  const query = buildQuery({ q: term, limit });
  const response = await fetch(`${baseUrl}/api/technology${query}`, {
    method: "GET",
    credentials: "include",
    signal,
  });
  return handleApiResponse<TechnologySearchResponse>(response);
}

export interface SubmitTechnologyRequestPayload {
  name: string;
  description?: string;
  aliases?: string[];
}

export async function submitTechnologyRequest(
  payload: SubmitTechnologyRequestPayload
) {
  const baseUrl = resolveApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/technology/requests`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return handleApiResponse<TechnologyRequestCreateResponse>(response);
}

export interface ListTechnologyRequestsParams {
  status?: "pending" | "approved" | "rejected";
  page?: number;
  limit?: number;
}

export async function listTechnologyRequestsApi(
  params: ListTechnologyRequestsParams = {},
  signal?: AbortSignal
) {
  const baseUrl = resolveApiBaseUrl();
  const query = buildQuery({
    status: params.status,
    page: params.page,
    limit: params.limit,
  });
  const response = await fetch(`${baseUrl}/api/technology/requests${query}`, {
    method: "GET",
    credentials: "include",
    signal,
  });
  return handleApiResponse<TechnologyRequestListResponse>(response);
}

export async function reviewTechnologyRequestApi(
  requestId: string,
  payload: TechnologyRequestDecisionPayload
) {
  const baseUrl = resolveApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/technology/requests/${requestId}/review`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );
  return handleApiResponse<{
    request: TechnologyRequest;
    technology?: TechnologySummary;
  }>(response);
}
