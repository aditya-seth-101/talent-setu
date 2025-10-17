import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchTalentProfile, searchTalent } from "../api/recruitment";
import type {
  PaginationInfo,
  TalentAvailability,
  TalentSearchResult,
} from "../types/recruitment";

export interface UseTalentSearchOptions {
  q?: string;
  location?: string;
  technologyIds?: string[];
  availability?: TalentAvailability[];
  kioskVerified?: boolean;
  hasAssessments?: boolean;
  minExperience?: number | null;
  maxExperience?: number | null;
  minRecruitmentScore?: number | null;
  maxRecruitmentScore?: number | null;
  technologyLabels?: string[];
  sort?: "score" | "recent" | "experience";
  page: number;
  limit?: number;
}

export function useTalentSearch({
  q,
  location,
  technologyIds = [],
  availability = [],
  kioskVerified,
  hasAssessments,
  minExperience,
  maxExperience,
  minRecruitmentScore,
  maxRecruitmentScore,
  technologyLabels,
  sort = "score",
  page,
  limit = 20,
}: UseTalentSearchOptions) {
  const [talent, setTalent] = useState<TalentSearchResult[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    searchTalent(
      {
        q: q?.trim() || undefined,
        location: location?.trim() || undefined,
        technology:
          technologyIds.length > 0
            ? technologyIds.filter((value) => value.trim().length > 0)
            : undefined,
        availability: availability.length > 0 ? availability : undefined,
        kioskVerified,
        hasAssessments,
        minExperience: minExperience ?? undefined,
        maxExperience: maxExperience ?? undefined,
        minRecruitmentScore: minRecruitmentScore ?? undefined,
        maxRecruitmentScore: maxRecruitmentScore ?? undefined,
        sort,
        page,
        limit,
      },
      controller.signal
    )
      .then((response) => {
        setTalent(response.talent);
        setPagination(response.pagination);
      })
      .catch((fetchError) => {
        if ((fetchError as Error).name === "AbortError") {
          return;
        }
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load talent";
        setError(message);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [
    q,
    location,
    technologyIds,
    availability,
    kioskVerified,
    hasAssessments,
    minExperience,
    maxExperience,
    minRecruitmentScore,
    maxRecruitmentScore,
    technologyLabels,
    sort,
    page,
    limit,
    refreshKey,
  ]);

  const appliedFilters = useMemo(() => {
    const filters: Array<{ label: string; value: string }> = [];

    if (q && q.trim()) {
      filters.push({ label: "Search", value: q.trim() });
    }

    if (location && location.trim()) {
      filters.push({ label: "Location", value: location.trim() });
    }

    if (technologyIds.length > 0) {
      filters.push({
        label: "Technologies",
        value:
          technologyLabels && technologyLabels.length === technologyIds.length
            ? technologyLabels.join(", ")
            : technologyIds.join(", "),
      });
    }

    if (availability.length > 0) {
      filters.push({
        label: "Availability",
        value: availability.join(", "),
      });
    }

    if (typeof kioskVerified === "boolean") {
      filters.push({
        label: "Kiosk verified",
        value: kioskVerified ? "Yes" : "No",
      });
    }

    if (typeof hasAssessments === "boolean") {
      filters.push({
        label: "Has assessments",
        value: hasAssessments ? "Yes" : "No",
      });
    }

    if (typeof minExperience === "number") {
      filters.push({ label: "Min exp", value: `${minExperience}y` });
    }

    if (typeof maxExperience === "number") {
      filters.push({ label: "Max exp", value: `${maxExperience}y` });
    }

    if (typeof minRecruitmentScore === "number") {
      filters.push({ label: "Min score", value: `${minRecruitmentScore}` });
    }

    if (typeof maxRecruitmentScore === "number") {
      filters.push({ label: "Max score", value: `${maxRecruitmentScore}` });
    }

    if (sort !== "score") {
      filters.push({ label: "Sort", value: sort });
    }

    return filters;
  }, [
    q,
    location,
    technologyIds,
    technologyLabels,
    availability,
    kioskVerified,
    hasAssessments,
    minExperience,
    maxExperience,
    minRecruitmentScore,
    maxRecruitmentScore,
    sort,
  ]);

  const refresh = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  const fetchDetail = useCallback(
    (profileId: string, signal?: AbortSignal) =>
      fetchTalentProfile(profileId, signal),
    []
  );

  return {
    talent,
    pagination,
    loading,
    error,
    appliedFilters,
    refresh,
    fetchTalentProfile: fetchDetail,
  };
}
