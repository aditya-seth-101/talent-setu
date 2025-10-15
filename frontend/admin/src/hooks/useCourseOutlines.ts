import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchCourseOutlines,
  fetchCourseOutlineById,
  updateCourseOutlineStatus,
  publishCourseOutline,
} from "../api/course-outlines";
import type {
  CourseOutlineSummary,
  ListCourseOutlineParams,
  OutlineReviewStatus,
  PublishCourseOutlineResponse,
} from "../types/course-outline";

export type StatusFilter = OutlineReviewStatus | "all";

export interface UseCourseOutlinesFilters {
  status: StatusFilter;
  search: string;
  technology: string;
  page: number;
  limit?: number;
}

export function useCourseOutlines({
  status,
  search,
  technology,
  page,
  limit = 10,
}: UseCourseOutlinesFilters) {
  const [outlines, setOutlines] = useState<CourseOutlineSummary[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const params: ListCourseOutlineParams = {
      status: status === "all" ? undefined : status,
      search: search.trim() || undefined,
      technology: technology.trim() || undefined,
      page,
      limit,
    };

    setLoading(true);
    setError(null);

    fetchCourseOutlines(params, controller.signal)
      .then((response) => {
        setOutlines(response.outlines);
        setTotalPages(response.pagination.totalPages);
        setTotalResults(response.pagination.total);
      })
      .catch((fetchError) => {
        if ((fetchError as Error).name === "AbortError") {
          return;
        }
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load course outlines";
        setError(message);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [status, search, technology, page, limit, refreshToken]);

  const appliedFilters = useMemo(() => {
    const filters: Array<{ label: string; value: string }> = [];

    if (status !== "all") {
      filters.push({ label: "Status", value: status });
    }

    if (technology.trim()) {
      filters.push({ label: "Tech", value: technology.trim() });
    }

    if (search.trim()) {
      filters.push({ label: "Search", value: search.trim() });
    }

    return filters;
  }, [search, status, technology]);

  async function handleStatusUpdate(
    id: string,
    payload: { reviewStatus: OutlineReviewStatus; reviewNotes?: string | null }
  ) {
    await updateCourseOutlineStatus(id, payload);
    setRefreshToken((token) => token + 1);
  }

  function refresh() {
    setRefreshToken((token) => token + 1);
  }

  const fetchOutlineByIdFn = useCallback(
    (id: string, signal?: AbortSignal) => fetchCourseOutlineById(id, signal),
    []
  );

  async function handlePublish(
    id: string
  ): Promise<PublishCourseOutlineResponse> {
    const result = await publishCourseOutline(id);
    setRefreshToken((token) => token + 1);
    return result;
  }

  return {
    outlines,
    totalPages,
    totalResults,
    loading,
    error,
    appliedFilters,
    updateStatus: handleStatusUpdate,
    refresh,
    fetchOutlineById: fetchOutlineByIdFn,
    publishOutline: handlePublish,
  };
}
