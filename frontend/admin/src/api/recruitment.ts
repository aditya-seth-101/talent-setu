import type {
  TalentProfileDetail,
  TalentSearchFilters,
  TalentSearchResponse,
} from "../types/recruitment";
import { handleApiResponse, resolveApiBaseUrl } from "./client";

function buildSearchQuery(filters: TalentSearchFilters = {}): string {
  const params = new URLSearchParams();

  if (!filters) {
    return params.toString();
  }

  const {
    q,
    location,
    technology,
    availability,
    minExperience,
    maxExperience,
    minRecruitmentScore,
    maxRecruitmentScore,
    kioskVerified,
    hasAssessments,
    sort,
    page,
    limit,
  } = filters;

  if (q && q.trim()) {
    params.set("q", q.trim());
  }

  if (location && location.trim()) {
    params.set("location", location.trim());
  }

  if (Array.isArray(technology)) {
    technology
      .filter(Boolean)
      .forEach((value) => params.append("technology", value));
  } else if (technology) {
    params.set("technology", technology);
  }

  if (Array.isArray(availability)) {
    availability.forEach((value) => params.append("availability", value));
  } else if (availability) {
    params.set("availability", availability);
  }

  if (typeof minExperience === "number") {
    params.set("minExperience", String(minExperience));
  }

  if (typeof maxExperience === "number") {
    params.set("maxExperience", String(maxExperience));
  }

  if (typeof minRecruitmentScore === "number") {
    params.set("minRecruitmentScore", String(minRecruitmentScore));
  }

  if (typeof maxRecruitmentScore === "number") {
    params.set("maxRecruitmentScore", String(maxRecruitmentScore));
  }

  if (typeof kioskVerified === "boolean") {
    params.set("kioskVerified", kioskVerified ? "true" : "false");
  }

  if (typeof hasAssessments === "boolean") {
    params.set("hasAssessments", hasAssessments ? "true" : "false");
  }

  if (sort) {
    params.set("sort", sort);
  }

  if (typeof page === "number" && page > 0) {
    params.set("page", String(page));
  }

  if (typeof limit === "number" && limit > 0) {
    params.set("limit", String(limit));
  }

  return params.toString();
}

export async function searchTalent(
  filters: TalentSearchFilters,
  signal?: AbortSignal
): Promise<TalentSearchResponse> {
  const baseUrl = resolveApiBaseUrl();
  const query = buildSearchQuery(filters);
  const url = `${baseUrl}/api/recruitment/talent${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    signal,
  });

  return handleApiResponse<TalentSearchResponse>(response);
}

export async function fetchTalentProfile(
  profileId: string,
  signal?: AbortSignal
): Promise<TalentProfileDetail> {
  const baseUrl = resolveApiBaseUrl();
  const url = `${baseUrl}/api/recruitment/talent/${profileId}`;

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    signal,
  });

  return handleApiResponse<TalentProfileDetail>(response);
}
